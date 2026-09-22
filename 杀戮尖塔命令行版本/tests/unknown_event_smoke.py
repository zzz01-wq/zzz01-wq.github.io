#!/usr/bin/env python3
"""Verify that an original Unknown map point exposes its Event choices before navigation."""

from __future__ import annotations

import argparse
import json
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path

from engine_smoke import DEFAULT_GODOT, GameHost, require, resolve_opening_event, sha256


ROOT = Path(__file__).resolve().parents[1]
ASSEMBLY = ROOT / "runtime" / ".godot" / "mono" / "temp" / "bin" / "Debug" / "SpireCli.dll"
REPORT = ROOT / ".cache" / "unknown-event-smoke.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--godot", type=Path, default=Path(os.environ.get("GODOT_BIN", DEFAULT_GODOT)))
    parser.add_argument("--dotnet-root", type=Path, default=None)
    parser.add_argument("--seed", default="BOSSFLOW")
    parser.add_argument("--timeout", type=float, default=90.0)
    parser.add_argument("--report", type=Path, default=REPORT)
    return parser.parse_args()


def dotnet_root_from_args(value: Path | None) -> Path:
    if value is not None:
        return value
    configured = os.environ.get("DOTNET_ROOT")
    if configured:
        return Path(configured)
    dotnet = shutil.which("dotnet")
    require(dotnet is not None, "Set DOTNET_ROOT or pass --dotnet-root")
    return Path(dotnet).resolve().parent


def take_first_reward(host: GameHost, state: dict) -> dict:
    if state.get("prompt", "").startswith("战利品"):
        state = host.command("take 1")
    while state.get("prompt", "").startswith("选择卡牌奖励"):
        state = host.command("choose 1")
    if any(action.get("command") == "skip" for action in state.get("actions", [])):
        state = host.command("skip")
    return state


def main() -> int:
    args = parse_args()
    godot = args.godot.expanduser().resolve()
    require(godot.is_file() and os.access(godot, os.X_OK), f"Godot is not executable: {godot}")
    require(ASSEMBLY.is_file(), f"Build the runtime first; missing {ASSEMBLY}")
    require(ASSEMBLY.stat().st_mtime_ns >= (ROOT / "runtime" / "Main.cs").stat().st_mtime_ns,
            "The runtime assembly is older than Main.cs; rebuild before the smoke test")

    args.report.parent.mkdir(parents=True, exist_ok=True)
    host = GameHost(godot, dotnet_root_from_args(args.dotnet_root).resolve(),
                    ROOT / ".cache" / "unknown-event-smoke-godot.log", args.timeout, test_hooks=True)
    report: dict = {
        "started_utc": datetime.now(timezone.utc).isoformat(),
        "main_cs_sha256": sha256(ROOT / "runtime" / "Main.cs"),
        "assembly_sha256": sha256(ASSEMBLY),
        "seed": args.seed,
    }
    try:
        state = host.snapshot()
        require(state.get("phase") == "ready", f"Unknown-event host did not start cleanly: {state}")
        state = resolve_opening_event(host.command, host.command(f"new ironclad {args.seed} 0"))

        # The original TestMode/first-run odds for BOSSFLOW put the second
        # route after two ordinary combats at an Unknown point. Keep the
        # combat completion on the original kill/check-win path.
        for _ in range(2):
            require(state.get("routes"), f"No route before the expected combat: {state}")
            state = host.command("move 1")
            require(state.get("phase") == "combat", f"Expected original combat, got: {state}")
            state = host.command("__test_kill all")
            state = take_first_reward(host, state)
            require(state.get("routes"), f"Combat did not expose the next original route: {state}")

        unknown = next((route for route in state["routes"] if route.get("name") == "Unknown"), None)
        require(unknown is not None, f"Fixed seed did not expose the expected Unknown route: {state['routes']}")
        state = host.command(f"move {unknown['index']}")
        require(state.get("phase") in ("Event", "EventRoom"),
                f"Unknown route did not enter the original EventRoom: {state}")
        require(state.get("eventState", {}).get("initialized") is True,
                f"Event snapshot was returned before original BeginEvent initialized: {state}")
        require(state.get("eventState", {}).get("finished") is False,
                f"Unknown event was already marked finished on entry: {state}")
        require(state.get("canLeave") is False and state.get("options"),
                f"Unknown event exposed navigation instead of original choices: {state}")
        require(all(option.get("command") == f"choose {option['index']}"
                    for option in state["options"]),
                f"Unknown event options were not actionable original choices: {state['options']}")
        report.update({
            "result": "passed",
            "snapshot": {
                "phase": state.get("phase"),
                "floor": state.get("floor"),
                "eventState": state.get("eventState"),
                "options": state.get("options"),
                "canLeave": state.get("canLeave"),
                "prompt": state.get("prompt"),
            },
            "commands": host.transcript,
            "diagnostics": host.diagnostics,
            "finished_utc": datetime.now(timezone.utc).isoformat(),
        })
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Unknown event smoke passed; report: {args.report}")
        return 0
    except BaseException as exc:
        report.update({"result": "failed", "failure": f"{type(exc).__name__}: {exc}",
                       "commands": host.transcript, "diagnostics": host.diagnostics,
                       "finished_utc": datetime.now(timezone.utc).isoformat()})
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        raise
    finally:
        host.close()


if __name__ == "__main__":
    raise SystemExit(main())
