#!/usr/bin/env python3
"""Exercise the built Godot host through its line protocol with original game data."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import platform
import queue
import shutil
import subprocess
import threading
import time
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PREFIX = "@@SPIRE@@"
DEFAULT_GODOT = ROOT / ".tools" / "godot" / "Godot_mono.app" / "Contents" / "MacOS" / "Godot"
ASSEMBLY = ROOT / "runtime" / ".godot" / "mono" / "temp" / "bin" / "Debug" / "SpireCli.dll"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


class GameHost:
    def __init__(self, godot: Path, dotnet_root: Path, log_path: Path, timeout: float, *, test_hooks: bool = False,
                 ephemeral_saves: bool = True, save_dir: str | None = None):
        self.timeout = timeout
        self.output: queue.Queue[str | None] = queue.Queue()
        self.diagnostics: list[str] = []
        self.transcript: list[dict] = []
        environment = os.environ.copy()
        environment["DOTNET_ROOT"] = str(dotnet_root)
        environment.setdefault("DOTNET_CLI_TELEMETRY_OPTOUT", "1")
        if ephemeral_saves:
            environment["SPIRECLI_EPHEMERAL_SAVES"] = "1"
        else:
            environment.pop("SPIRECLI_EPHEMERAL_SAVES", None)
            if save_dir is not None:
                environment["SPIRECLI_SAVE_DIR"] = save_dir
        if test_hooks:
            environment["SPIRECLI_ENABLE_TEST_HOOKS"] = "1"
        self.process = subprocess.Popen(
            [
                str(godot),
                "--headless",
                "--path",
                str(ROOT / "runtime"),
                "--log-file",
                str(log_path.resolve()),
            ],
            cwd=ROOT,
            env=environment,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
            bufsize=1,
        )
        self.reader = threading.Thread(target=self._read_output, daemon=True)
        self.reader.start()

    def _read_output(self) -> None:
        assert self.process.stdout is not None
        try:
            for line in self.process.stdout:
                self.output.put(line)
        finally:
            self.output.put(None)

    def snapshot(self) -> dict:
        deadline = time.monotonic() + self.timeout
        while True:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise TimeoutError(f"Timed out waiting for {PREFIX} snapshot")
            try:
                line = self.output.get(timeout=min(remaining, 0.5))
            except queue.Empty:
                if self.process.poll() is not None:
                    raise RuntimeError(f"Godot exited with status {self.process.returncode}")
                continue
            if line is None:
                raise RuntimeError(f"Godot exited before publishing a snapshot: {self.diagnostics[-20:]}")
            if not line.startswith(PREFIX):
                self.diagnostics.append(line.rstrip("\r\n")[-1200:])
                self.diagnostics = self.diagnostics[-80:]
                continue
            result = json.loads(line[len(PREFIX) :])
            if not isinstance(result, dict):
                raise RuntimeError("Host snapshot is not a JSON object")
            return result

    def command(self, command: str) -> dict:
        assert self.process.stdin is not None
        if self.process.poll() is not None:
            raise RuntimeError(f"Godot exited with status {self.process.returncode}")
        self.process.stdin.write(command + "\n")
        self.process.stdin.flush()
        state = self.snapshot()
        self.transcript.append({"command": command, "snapshot": state})
        return state

    def close(self) -> None:
        if self.process.poll() is not None:
            return
        try:
            if self.process.stdin:
                self.process.stdin.close()
            self.process.wait(timeout=5)
        except (OSError, subprocess.TimeoutExpired):
            self.process.terminate()
            try:
                self.process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait(timeout=3)


def first_card(state: dict, card_id: str) -> dict:
    for card in state.get("hand", []):
        if card.get("id") == card_id:
            return card
    raise AssertionError(f"Expected {card_id} in the current hand")


def clear_first_combat(host: "GameHost", state: dict) -> dict:
    """Play the seed's original opening deck until the engine offers room rewards."""
    for _ in range(80):
        if state.get("phase") != "combat":
            return state
        require(state.get("player") and state["player"]["hp"] > 0,
                "Ironclad died before the first combat ended")
        playable = [card for card in state.get("hand", [])
                    if int(card.get("cost", 0)) <= int(state["player"].get("energy", 0))]
        if playable:
            playable.sort(key=lambda card: (0 if card.get("id") == "BASH" else 1,
                                            0 if card.get("type") == "Attack" else 1,
                                            int(card.get("cost", 0))))
            card = playable[0]
            suffix = " 1" if card.get("targetType") in ("AnyEnemy", "AnyAlly") else ""
            state = host.command(f"play {card['index']}{suffix}")
            continue
        state = host.command("end")
    raise AssertionError("First combat did not settle within 80 engine commands")


def check_reference_fingerprints() -> dict:
    manifest = json.loads((ROOT / "docs" / "reference-manifest.json").read_text(encoding="utf-8"))
    actual = {}
    for filename, expected_hash in manifest["files"].items():
        path = ROOT / "reference" / filename
        require(path.is_file(), f"Missing original input: {path}")
        actual[filename] = sha256(path)
        require(actual[filename] == expected_hash, f"Original input fingerprint mismatch: {filename}")
    return {"manifest": manifest, "actual_hashes": actual}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--godot", type=Path, default=Path(os.environ.get("GODOT_BIN", DEFAULT_GODOT)))
    parser.add_argument("--dotnet-root", type=Path, default=None)
    parser.add_argument("--seed", default="WEBTEST")
    parser.add_argument("--timeout", type=float, default=60.0)
    parser.add_argument("--report", type=Path, default=ROOT / ".cache" / "engine-smoke.json")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    godot = args.godot.expanduser().resolve()
    require(godot.is_file() and os.access(godot, os.X_OK), f"Godot is not executable: {godot}")
    require(ASSEMBLY.is_file(), f"Build the runtime first; missing {ASSEMBLY}")
    require(
        ASSEMBLY.stat().st_mtime_ns >= (ROOT / "runtime" / "Main.cs").stat().st_mtime_ns,
        "The runtime assembly is older than Main.cs; rebuild before the smoke test",
    )

    version_result = subprocess.run(
        [str(godot), "--version"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        timeout=10,
        check=False,
    )
    godot_version = (version_result.stdout + version_result.stderr).strip()
    require(version_result.returncode == 0 and "4.5.1" in godot_version and ".mono." in godot_version,
            f"Expected Godot Mono 4.5.1, received: {godot_version}")

    dotnet_root = args.dotnet_root
    if dotnet_root is None:
        configured = os.environ.get("DOTNET_ROOT")
        if configured:
            dotnet_root = Path(configured)
        else:
            dotnet = shutil.which("dotnet")
            if dotnet:
                dotnet_root = Path(dotnet).resolve().parent
    require(dotnet_root is not None and dotnet_root.is_dir(), "Set DOTNET_ROOT or pass --dotnet-root")

    fingerprint = check_reference_fingerprints()
    args.report.parent.mkdir(parents=True, exist_ok=True)
    log_path = ROOT / ".cache" / "engine-smoke-godot.log"
    host = GameHost(godot, dotnet_root.resolve(), log_path, args.timeout)
    report = {
        "started_utc": datetime.now(timezone.utc).isoformat(),
        "platform": platform.platform(),
        "architecture": platform.machine(),
        "godot_version": godot_version,
        "dotnet_root": str(dotnet_root.resolve()),
        "requested_build": fingerprint["manifest"].get("requested_build"),
        "build_verified": fingerprint["manifest"].get("build_verified"),
        "source_hashes": fingerprint["actual_hashes"],
        "main_cs_sha256": sha256(ROOT / "runtime" / "Main.cs"),
        "assembly_sha256": sha256(ASSEMBLY),
        "seed": args.seed,
        "initial_progress": "fresh singleplayer profile 1; ascension 0",
        "commands": [],
        "godot_log": str(log_path),
    }
    failure: BaseException | None = None
    try:
        initial = host.snapshot()
        report["initial_snapshot"] = initial
        require(initial.get("phase") == "ready" and initial.get("player") is None,
                "Host did not start in a clean ready state")

        help_state = host.command("help")
        require(help_state.get("player") is None and any("new ironclad" in m for m in help_state.get("messages", [])),
                "help failed before a run started")

        catalog_state = host.command("cards")
        require(catalog_state.get("player") is None and any("战士卡牌" in m for m in catalog_state.get("messages", [])),
                "cards failed without an active player")

        state = host.command(f"new ironclad {args.seed} 0")
        require(state.get("seed") == args.seed and state.get("player") is not None,
                "new ironclad did not create a run")
        route = next((item for item in state.get("routes", []) if item.get("name") == "Monster"), None)
        require(route is not None, "The selected seed has no visible first Monster route")

        state = host.command(f"move {route['index']}")
        require(state.get("phase") == "combat" and state.get("enemies"),
                "Following the displayed Monster route did not enter combat")

        defend = first_card(state, "DEFEND_IRONCLAD")
        before = state
        state = host.command(f"play {defend['index']}")
        require(state["player"]["block"] > before["player"]["block"],
                "Self-target Defend did not resolve through the original action queue")
        require(state["player"]["energy"] < before["player"]["energy"],
                "Self-target Defend did not spend energy")

        attack = first_card(state, "STRIKE_IRONCLAD")
        unchanged = state
        state = host.command(f"play {attack['index']}")
        require(state.get("messages") and state["player"]["energy"] == unchanged["player"]["energy"],
                "An enemy-target Strike without a target was not rejected cleanly")
        require(state["enemies"] == unchanged["enemies"] and state["hand"] == unchanged["hand"],
                "A missing-target error mutated the combat state")

        state = host.command(f"play {attack['index']} 1")
        require(state["enemies"][0]["hp"] < unchanged["enemies"][0]["hp"],
                "Enemy-target Strike did not lower the selected enemy's HP")

        second_strike = next((card for card in state["hand"] if card.get("id") == "STRIKE_IRONCLAD"), None)
        require(second_strike is not None, "The fixed smoke seed did not leave another Strike in hand")
        state = host.command(f"play {second_strike['index']} 1")
        require(state["player"]["energy"] == 0, "Expected the smoke turn to spend its remaining energy")

        rejected = next((card for card in state["hand"] if int(card.get("cost", 0)) > 0), None)
        require(rejected is not None, "No positive-cost card remained to check insufficient energy")
        command = f"play {rejected['index']} 1" if rejected.get("targetType") in ("AnyEnemy", "AnyAlly") else f"play {rejected['index']}"
        unchanged = state
        state = host.command(command)
        require(state.get("messages") and state["player"]["energy"] == unchanged["player"]["energy"],
                "A play with insufficient energy was not rejected")
        require(state["enemies"] == unchanged["enemies"] and state["hand"] == unchanged["hand"],
                "An insufficient-energy error mutated the combat state")

        state = host.command("end")
        require(state.get("phase") == "combat" and state["player"]["turn"] == 2,
                "end did not complete the enemy phase and advance to the next player turn")
        require(state["player"]["energy"] == state["player"]["maxEnergy"],
                "Energy did not refresh for the next player turn")

        state = clear_first_combat(host, state)
        require(state.get("phase") == "choice" and "战利品" in state.get("prompt", ""),
                "Winning the first combat did not expose the original RewardsSet")

        took_card_reward = False
        for _ in range(12):
            prompt = state.get("prompt", "")
            if prompt.startswith("战利品"):
                state = host.command("take 1")
                continue
            if prompt.startswith("选择卡牌奖励"):
                card_options = [option for option in state.get("options", [])
                                if option.get("kind") != "alternative"]
                require(card_options, "CardReward exposed no original card choices")
                state = host.command("choose 1")
                took_card_reward = True
                continue
            break
        require(took_card_reward, "Did not select a card from the first original card reward")
        require(state.get("canLeave") or state.get("phase") == "Map",
                "Completing the original reward set did not return to the map")
        next_route = state.get("routes", [])[0] if state.get("routes") else None
        require(next_route is not None, "No original route appeared after the first reward set")
        state = host.command(f"move {next_route['index']}")
        require(state.get("floor", 0) >= 2 and state.get("player") is not None,
                "Following the displayed next route did not enter the next room")

        state = host.command("abandon")
        require(state.get("phase") == "ready" and state.get("player") is None and not state.get("busy"),
                "abandon left the host or run lifecycle busy")
        state = host.command(f"new ironclad {args.seed} 0")
        require(state.get("player") is not None and state.get("seed") == args.seed,
                "A new run could not start after abandoning the previous run")

        report["result"] = "passed"
        report["commands"] = host.transcript
    except BaseException as exc:
        failure = exc
        report["result"] = "failed"
        report["error"] = f"{type(exc).__name__}: {exc}"
        report["commands"] = host.transcript
        raise
    finally:
        host.close()
        report["diagnostics"] = host.diagnostics
        report["finished_utc"] = datetime.now(timezone.utc).isoformat()
        report["failure_type"] = None if failure is None else type(failure).__name__
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Engine smoke {report['result']}; report: {args.report}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
