#!/usr/bin/env python3
"""Verify the original Act 2/3 Ancient opening route through terminal commands."""

from __future__ import annotations

import argparse
import json
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path

from engine_smoke import DEFAULT_GODOT, GameHost, require, sha256
from room_flow_smoke import settle_rewards_and_selectors


ROOT = Path(__file__).resolve().parents[1]
ASSEMBLY = ROOT / "runtime" / ".godot" / "mono" / "temp" / "bin" / "Debug" / "SpireCli.dll"
REPORT = ROOT / ".cache" / "act-opening-smoke.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--godot", type=Path, default=Path(os.environ.get("GODOT_BIN", DEFAULT_GODOT)))
    parser.add_argument("--dotnet-root", type=Path, default=None)
    parser.add_argument("--seed", default="WEBTEST")
    parser.add_argument("--timeout", type=float, default=90.0)
    parser.add_argument("--report", type=Path, default=REPORT)
    return parser.parse_args()


def select_opening_ancient(host: GameHost, state: dict, act_number: int) -> tuple[dict, str]:
    state = host.command(f"__test_enter_act {act_number}")
    require(state.get("act") == act_number and state.get("phase") == "Map",
            f"Act {act_number} did not open at its original map room: {state}")
    routes = state.get("routes", [])
    require(len(routes) == 1 and routes[0].get("name") == "Ancient" and routes[0].get("row") == 0,
            f"Act {act_number} did not expose its Ancient start as the only opening route: {routes}")

    state = host.command("move 1")
    require(state.get("phase") == "Event" and state.get("options"),
            f"Act {act_number} Ancient route did not open a selectable event: {state}")
    state = host.command("__test_assert_ancient")
    evidence = next((line for line in state.get("messages", []) if "随机预选 Ancient" in line), None)
    require(evidence is not None, f"Act {act_number} opened a room other than its pre-generated Ancient")

    state = resolve_ancient_options(host, state, act_number)
    state = host.command("proceed")
    require(state.get("canLeave") and state.get("routes"),
            f"Act {act_number} did not expose map travel after resolving its opening Ancient")
    return state, evidence


def resolve_ancient_options(host: GameHost, state: dict, act_number: int) -> dict:
    for _ in range(12):
        if state.get("phase") != "Event" or state.get("canLeave"):
            break
        enabled = [option for option in state.get("options", []) if not option.get("disabled")]
        require(enabled, f"Act {act_number} Ancient had no enabled original event option")
        state = host.command(f"choose {enabled[0]['index']}")
        state = settle_rewards_and_selectors(host, state)
    require(state.get("phase") == "Event" and state.get("canLeave"),
            f"Act {act_number} Ancient option did not finish through the command selector: {state}")
    return state


def main() -> int:
    args = parse_args()
    godot = args.godot.expanduser().resolve()
    require(godot.is_file() and os.access(godot, os.X_OK), f"Godot is not executable: {godot}")
    require(ASSEMBLY.is_file(), f"Build the runtime first; missing {ASSEMBLY}")
    require(ASSEMBLY.stat().st_mtime_ns >= (ROOT / "runtime" / "Main.cs").stat().st_mtime_ns,
            "The runtime assembly is older than Main.cs; rebuild before the smoke test")

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

    args.report.parent.mkdir(parents=True, exist_ok=True)
    host = GameHost(godot, dotnet_root.resolve(), ROOT / ".cache" / "act-opening-smoke-godot.log",
                    args.timeout, test_hooks=True)
    report: dict = {
        "started_utc": datetime.now(timezone.utc).isoformat(),
        "main_cs_sha256": sha256(ROOT / "runtime" / "Main.cs"),
        "assembly_sha256": sha256(ASSEMBLY),
        "seed": args.seed,
        "acts": {},
        "commands": [],
    }
    try:
        state = host.snapshot()
        require(state.get("phase") == "ready", "Act-opening host did not start cleanly")
        state = host.command(f"new ironclad {args.seed} 0")
        require(state.get("act") == 1 and state.get("phase") == "Event" and state.get("options"),
                f"Normal new ironclad did not enter its Neow opening event: {state}")
        require(state.get("eventText") == "",
                "Neow's absent original INITIAL description should be omitted while its event options remain visible")
        state = host.command("__test_assert_ancient")
        neow_evidence = next((line for line in state.get("messages", []) if "固定 Ancient NEOW" in line), None)
        require(neow_evidence is not None, "Normal new ironclad did not enter its fixed Neow opening")
        state = resolve_ancient_options(host, state, 1)
        state = host.command("proceed")
        require(state.get("canLeave") and state.get("routes"), "Neow did not expose the Act 1 map routes")
        report["acts"]["1"] = {
            "event_model": neow_evidence,
            "opening_route": "Neow auto-entry",
            "map_travel_open": True,
        }

        for act_number in (2, 3):
            state, evidence = select_opening_ancient(host, state, act_number)
            report["acts"][str(act_number)] = {
                "event_model": evidence,
                "map_travel_open": bool(state.get("routes")),
                "opening_route": "Ancient",
            }
        state = host.command("abandon")
        require(not state.get("hasRunSave"), "Abandon left a current run save behind")

        report["result"] = "passed"
        report["commands"] = host.transcript
        report["diagnostics"] = host.diagnostics
        report["finished_utc"] = datetime.now(timezone.utc).isoformat()
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({"result": report["result"], "acts": report["acts"], "report": str(args.report)},
                         ensure_ascii=False, indent=2))
        return 0
    except Exception as exc:
        report["result"] = "failed"
        report["failure"] = f"{type(exc).__name__}: {exc}"
        report["commands"] = host.transcript
        report["diagnostics"] = host.diagnostics
        report["finished_utc"] = datetime.now(timezone.utc).isoformat()
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        raise
    finally:
        host.close()


if __name__ == "__main__":
    raise SystemExit(main())
