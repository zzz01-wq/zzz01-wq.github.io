#!/usr/bin/env python3
"""Verify original run autosaves survive a Godot process restart."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path

from engine_smoke import DEFAULT_GODOT, GameHost, clear_first_combat, require, sha256


ROOT = Path(__file__).resolve().parents[1]
ASSEMBLY = ROOT / "runtime" / ".godot" / "mono" / "temp" / "bin" / "Debug" / "SpireCli.dll"
REPORT = ROOT / ".cache" / "save-smoke.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--godot", type=Path, default=Path(os.environ.get("GODOT_BIN", DEFAULT_GODOT)))
    parser.add_argument("--dotnet-root", type=Path, default=None)
    parser.add_argument("--seed", default="SAVEFLOW")
    parser.add_argument("--timeout", type=float, default=90.0)
    parser.add_argument("--report", type=Path, default=REPORT)
    return parser.parse_args()


def find_dotnet_root(configured: Path | None) -> Path:
    if configured is not None:
        return configured
    environment_root = os.environ.get("DOTNET_ROOT")
    if environment_root:
        return Path(environment_root)
    dotnet = shutil.which("dotnet")
    if dotnet:
        return Path(dotnet).resolve().parent
    raise RuntimeError("Set DOTNET_ROOT or pass --dotnet-root")


def main() -> int:
    args = parse_args()
    godot = args.godot.expanduser().resolve()
    dotnet_root = find_dotnet_root(args.dotnet_root).expanduser().resolve()
    require(godot.is_file() and os.access(godot, os.X_OK), f"Godot is not executable: {godot}")
    require(ASSEMBLY.is_file(), f"Build the runtime first; missing {ASSEMBLY}")
    require(ASSEMBLY.stat().st_mtime_ns >= (ROOT / "runtime" / "Main.cs").stat().st_mtime_ns,
            "The runtime assembly is older than Main.cs; rebuild before the smoke test")

    save_dir = f"res://.cache/spirecli-save-smoke-{uuid.uuid4().hex}"
    report: dict = {
        "started_utc": datetime.now(timezone.utc).isoformat(),
        "main_cs_sha256": sha256(ROOT / "runtime" / "Main.cs"),
        "assembly_sha256": sha256(ASSEMBLY),
        "seed": args.seed,
        "save_dir": save_dir,
        "processes": [],
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    first = GameHost(godot, dotnet_root, ROOT / ".cache" / "save-smoke-first.log", args.timeout,
                     ephemeral_saves=False, save_dir=save_dir)
    try:
        state = first.snapshot()
        require(state.get("phase") == "ready" and state.get("engineMode") == "TestMode/headless",
                "Save smoke did not start in the expected headless engine mode")
        require(not state.get("hasRunSave"), "Unique save directory unexpectedly contained a run save")

        state = first.command(f"new ironclad {args.seed} 0")
        route = next((item for item in state.get("routes", []) if item.get("name") == "Monster"), None)
        require(route is not None, "Save smoke seed has no first Monster route")
        state = first.command(f"move {route['index']}")
        require(state.get("phase") == "combat", "Following the first route did not enter combat")
        state = clear_first_combat(first, state)
        require(state.get("phase") == "choice" and state.get("prompt", "").startswith("战利品"),
                "Original combat did not reach its pre-finished reward checkpoint")
        require(state.get("hasRunSave"), "Original combat checkpoint did not write current_run.save")
        saved_fields = {key: state["player"][key] for key in ("hp", "gold", "deck")}
        first_report = {
            "state_before_restart": state,
            "saved_player_fields": saved_fields,
            "commands": first.transcript,
        }
    finally:
        first.close()
    report["processes"].append(first_report)

    second = GameHost(godot, dotnet_root, ROOT / ".cache" / "save-smoke-second.log", args.timeout,
                      ephemeral_saves=False, save_dir=save_dir)
    try:
        ready = second.snapshot()
        require(ready.get("phase") == "ready" and ready.get("hasRunSave"),
                "Run save was not available after restarting Godot")
        require("continue" in ready.get("prompt", ""), "Ready prompt did not expose the saved-run continue command")

        state = second.command("continue")
        require(state.get("phase") == "choice" and state.get("prompt", "").startswith("战利品"),
                "continue did not restore the original pre-finished combat reward state")
        actual_fields = {key: state["player"][key] for key in ("hp", "gold", "deck")}
        require(actual_fields == saved_fields,
                f"Original SerializableRun restore changed player state: before={saved_fields}, after={actual_fields}")
        require(state.get("seed") == args.seed and state.get("floor") == first_report["state_before_restart"].get("floor"),
                "Run save restore changed seed or floor")
        require(any("已恢复战士旅程" in message for message in state.get("messages", [])),
                "continue did not report a successful restore")

        state = second.command("abandon")
        require(state.get("phase") == "ready" and not state.get("hasRunSave"),
                "abandon did not remove the persistent original run save")
        report["processes"].append({
            "restored_state": state,
            "commands": second.transcript,
        })
        report["result"] = "passed"
    except BaseException as exc:
        report["result"] = "failed"
        report["failure"] = f"{type(exc).__name__}: {exc}"
        report["processes"].append({"commands": second.transcript, "diagnostics": second.diagnostics})
        raise
    finally:
        second.close()
        if save_dir.startswith("res://.cache/spirecli-save-smoke-"):
            isolated_dir = ROOT / "runtime" / ".cache" / save_dir.rsplit("/", 1)[-1]
            if isolated_dir.parent.resolve() == (ROOT / "runtime" / ".cache").resolve():
                shutil.rmtree(isolated_dir, ignore_errors=True)
        report["finished_utc"] = datetime.now(timezone.utc).isoformat()
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Save smoke {report.get('result', 'failed')}; report: {args.report}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
