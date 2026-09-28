#!/usr/bin/env python3
"""Verify Regent's original unlock progression, starting loadout, and star counter."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path

from engine_smoke import ASSEMBLY, DEFAULT_GODOT, GameHost, require, resolve_opening_event, sha256


ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / ".cache" / "regent-character-smoke.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--godot", type=Path, default=Path(os.environ.get("GODOT_BIN", DEFAULT_GODOT)))
    parser.add_argument("--dotnet-root", type=Path, default=None)
    parser.add_argument("--seed", default="REGENTFLOW")
    parser.add_argument("--timeout", type=float, default=90.0)
    parser.add_argument("--report", type=Path, default=REPORT)
    return parser.parse_args()


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
    save_dir = f"res://.cache/spirecli-regent-character-smoke-{uuid.uuid4().hex}"
    host = GameHost(godot, dotnet_root.resolve(), ROOT / ".cache" / "regent-character-godot.log",
                    args.timeout, ephemeral_saves=False, save_dir=save_dir)
    report: dict = {
        "started_utc": datetime.now(timezone.utc).isoformat(),
        "main_cs_sha256": sha256(ROOT / "runtime" / "Main.cs"),
        "assembly_sha256": sha256(ASSEMBLY),
        "seed": args.seed,
        "save_dir": save_dir,
        "steps": [],
    }
    try:
        state = host.snapshot()
        characters = {item["id"]: item for item in state.get("characters", [])}
        require(state.get("phase") == "ready" and state.get("player") is None,
                f"Regent host did not start at the character menu: {state}")
        require(characters.get("ironclad", {}).get("unlocked") is True
                and characters.get("silent", {}).get("unlocked") is False
                and characters.get("regent", {}).get("unlocked") is False,
                f"Fresh profile did not retain the original character lock states: {characters}")
        require(not state.get("timelineCharacterUnlocks"),
                "Fresh profile exposed a character timeline unlock before its original run prerequisite")
        state = host.command("new regent REGENTLOCK 0")
        require(state.get("messageError") and state.get("player") is None,
                f"Locked Regent unexpectedly started: {state}")
        report["steps"].append({"step": "fresh profile", "ironclad": "unlocked", "silent": "locked",
                                "regent": "locked", "locked_start_rejected": True})

        state = host.command("new ironclad REGENTPRE 0")
        require(state.get("player", {}).get("character") == "ironclad",
                "Ironclad prerequisite run did not start")
        state = host.command("abandon")
        require(any(item.get("id") == "SILENT1_EPOCH"
                    for item in state.get("timelineCharacterUnlocks", [])),
                f"Ironclad run did not produce its original Silent unlock epoch: {state}")
        state = host.command("reveal SILENT1_EPOCH")
        require(next(item for item in state["characters"] if item["id"] == "silent")["unlocked"],
                "Revealing Silent's original epoch did not unlock her")
        report["steps"].append({"step": "Ironclad run and Silent epoch reveal", "silent_unlocked": True})

        state = host.command("new silent REGENTUNLOCK 0")
        require(state.get("player", {}).get("character") == "silent",
                "Silent prerequisite run did not start")
        state = host.command("abandon")
        regent_epoch = next((item for item in state.get("timelineCharacterUnlocks", [])
                             if item.get("id") == "REGENT1_EPOCH"), None)
        require(regent_epoch is not None,
                f"Completing a Silent run did not expose the original Regent epoch: {state}")
        require("静默猎手" in regent_epoch.get("unlockInfo", ""),
                f"Regent epoch condition was not rendered from the original localized text: {regent_epoch}")
        state = host.command("new regent REGENTLOCK2 0")
        require(state.get("messageError") and state.get("player", {}).get("character") != "regent",
                "Regent started before its original Timeline epoch was revealed")
        state = host.command("reveal REGENT1_EPOCH")
        regent = next(item for item in state["characters"] if item["id"] == "regent")
        require(regent["unlocked"] and regent.get("name") == "储君",
                f"Revealing Regent's original epoch did not unlock the character: {regent}")
        report["steps"].append({"step": "Silent run and Regent epoch reveal", "regent_unlocked": True,
                                "epoch_condition": regent_epoch.get("unlockInfo")})

        state = host.command(f"new regent {args.seed} 0")
        player = state.get("player") or {}
        regent = next(item for item in state["characters"] if item["id"] == "regent")
        require(player.get("character") == "regent" and player.get("name") == regent.get("name")
                and player.get("hp") == 75 and player.get("maxHp") == 75
                and player.get("gold") == 99 and player.get("deck") == 10,
                f"Regent did not use the original starting character model: {state}")
        require(state.get("phase") == "Event" and state.get("options"),
                "Regent did not enter the original Neow opening")
        starting_relics = player.get("relics", [])
        require(starting_relics and starting_relics[0].get("name") == regent.get("relic"),
                f"Regent did not receive the original starting relic: {state}")
        deck_state = host.command("deck")
        deck_lines = deck_state.get("messages", [])
        require(sum("打击" in line for line in deck_lines) == 4
                and sum("防御" in line for line in deck_lines) == 4
                and any("陨星" in line for line in deck_lines)
                and any("崇拜" in line for line in deck_lines),
                f"Regent's starting deck did not match the original Regent model: {deck_lines}")
        report["steps"].append({"step": "Regent original starting setup", "hp": 75, "gold": 99,
                                "deck": ["4×打击", "4×防御", "陨星", "崇拜"],
                                "starting_relic": starting_relics[0].get("name")})

        state = resolve_opening_event(host.command, state)
        monster_route = next((item for item in state.get("routes", []) if item.get("name") == "Monster"), None)
        require(monster_route is not None, f"No original Monster route was available: {state.get('routes')}")
        state = host.command(f"move {monster_route['index']}")
        player = state.get("player") or {}
        require(state.get("phase") == "combat" and player.get("stars") == 3
                and player.get("showStarCounter") is True and player.get("starTitle") == "辉星",
                f"Regent's original Divine Right star gain/counter was not present in combat: {state}")
        report["steps"].append({"step": "Regent first combat", "stars": player.get("stars"),
                                "counter_title": player.get("starTitle"),
                                "starting_relic": starting_relics[0].get("name")})

        report["result"] = "passed"
        report["commands"] = host.transcript
        report["diagnostics"] = host.diagnostics
        report["finished_utc"] = datetime.now(timezone.utc).isoformat()
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({"result": report["result"], "steps": report["steps"], "report": str(args.report)},
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
