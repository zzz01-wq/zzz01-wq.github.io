#!/usr/bin/env python3
"""Verify that a completed first-act Boss can enter the original next act."""

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
REPORT = ROOT / ".cache" / "boss-transition-smoke.json"


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


def advance_to_first_boss(host: GameHost, state: dict) -> dict:
    """Use only the enabled original choices and the test kill hook for combat."""
    for _ in range(180):
        phase = state.get("phase")
        prompt = state.get("prompt", "")
        routes = state.get("routes", [])

        if phase == "combat":
            state = host.command("__test_kill all")
            continue

        if phase == "choice":
            actions = state.get("actions", [])
            options = state.get("options", [])
            if any(action.get("command") == "skip" for action in actions):
                state = host.command("skip")
                continue
            if prompt.startswith("战利品"):
                state = host.command("take 1")
                continue
            if prompt.startswith("选择卡牌奖励"):
                state = host.command("choose 1")
                continue
            selection = state.get("selection")
            if selection is not None:
                minimum = int(selection.get("min", 0))
                state = host.command("skip" if minimum == 0 else
                                     "choose " + " ".join(str(index + 1) for index in range(minimum)))
                continue
            enabled = [option for option in options if not option.get("disabled")]
            require(enabled, f"Choice did not expose an enabled original option: {state}")
            state = host.command(f"choose {enabled[0]['index']}")
            continue

        if phase in ("Event", "EventRoom"):
            if state.get("canLeave") and routes:
                state = host.command(f"move {routes[0]['index']}")
                continue
            enabled = [option for option in state.get("options", []) if not option.get("disabled")]
            require(enabled, f"Event did not expose an enabled original option: {state}")
            state = host.command(f"choose {enabled[0]['index']}")
            continue

        if phase in ("RestSite", "RestSiteRoom"):
            enabled = [option for option in state.get("options", []) if not option.get("disabled")]
            if enabled:
                option = next((item for item in enabled if item.get("id") == "HEAL"), enabled[0])
                state = host.command(f"choose {option['index']}")
                continue
            require(state.get("canLeave") and routes,
                    f"Rest site did not expose original travel after its action: {state}")
            state = host.command(f"move {routes[0]['index']}")
            continue

        if phase in ("Treasure", "TreasureRoom"):
            commands = [option.get("command") for option in state.get("options", [])]
            if "open" in commands:
                state = host.command("open")
                continue
            if any(command and command.startswith("choose ") for command in commands):
                state = host.command("choose 1")
                continue
            if any(action.get("command") == "skip" for action in state.get("actions", [])):
                state = host.command("skip")
                continue
            require(state.get("canLeave") and routes, f"Treasure did not expose original travel: {state}")
            state = host.command(f"move {routes[0]['index']}")
            continue

        if phase in ("Shop", "MerchantRoom"):
            require(state.get("canLeave") and routes, f"Shop did not expose original travel: {state}")
            state = host.command(f"move {routes[0]['index']}")
            continue

        if phase in ("Map", "MapRoom") or (state.get("canLeave") and routes):
            require(routes, f"Map/room had no original route before first Boss: {state}")
            state = host.command(f"move {routes[0]['index']}")
            continue

        if phase == "Boss":
            return state

        raise AssertionError(f"Could not advance to first Boss: {state}")
    raise AssertionError("The fixed original route did not reach the first Boss")


def main() -> int:
    args = parse_args()
    godot = args.godot.expanduser().resolve()
    require(godot.is_file() and os.access(godot, os.X_OK), f"Godot is not executable: {godot}")
    require(ASSEMBLY.is_file(), f"Build the runtime first; missing {ASSEMBLY}")
    require(ASSEMBLY.stat().st_mtime_ns >= (ROOT / "runtime" / "Main.cs").stat().st_mtime_ns,
            "The runtime assembly is older than Main.cs; rebuild before the smoke test")

    args.report.parent.mkdir(parents=True, exist_ok=True)
    host = GameHost(godot, dotnet_root_from_args(args.dotnet_root).resolve(),
                    ROOT / ".cache" / "boss-transition-smoke-godot.log", args.timeout, test_hooks=True)
    report: dict = {
        "started_utc": datetime.now(timezone.utc).isoformat(),
        "main_cs_sha256": sha256(ROOT / "runtime" / "Main.cs"),
        "assembly_sha256": sha256(ASSEMBLY),
        "seed": args.seed,
    }
    try:
        state = host.snapshot()
        require(state.get("phase") == "ready", "Boss-transition host did not start cleanly")
        state = host.command(f"new ironclad {args.seed} 0")
        require(state.get("act") == 1 and state.get("actCount") == 3,
                f"Standard Ironclad run did not expose the original three-act list: {state}")
        state = resolve_opening_event(host.command, state)
        state = advance_to_first_boss(host, state)
        require(state.get("phase") == "Boss" and state.get("act") == 1 and state.get("canLeave"),
                f"First Boss did not finish with a leaveable original room: {state}")
        action = next((item for item in state.get("actions", []) if item.get("command") == "proceed"), None)
        require(action is not None, f"Completed first Boss did not expose the next-act action: {state}")
        before = {"act": state.get("act"), "phase": state.get("phase"), "prompt": state.get("prompt"),
                  "actions": state.get("actions")}

        state = host.command("proceed")
        routes = state.get("routes", [])
        require(state.get("act") == 2 and state.get("actCount") == 3 and state.get("phase") == "Map",
                f"Original EnterNextAct did not open Act 2: {state}")
        require(len(routes) == 1 and routes[0].get("name") == "Ancient",
                f"Act 2 did not expose its original Ancient opening route: {routes}")
        after = {"act": state.get("act"), "actCount": state.get("actCount"), "phase": state.get("phase"),
                 "routes": routes, "map_act": (state.get("map") or {}).get("act")}

        report.update({"result": "passed", "before": before, "after": after,
                       "commands": host.transcript, "diagnostics": host.diagnostics,
                       "finished_utc": datetime.now(timezone.utc).isoformat()})
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Boss transition smoke passed; report: {args.report}")
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
