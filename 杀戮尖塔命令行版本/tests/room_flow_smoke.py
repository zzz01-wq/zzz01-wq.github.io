#!/usr/bin/env python3
"""Exercise the original Ironclad shop, event, rest, and treasure flows."""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path

from engine_smoke import DEFAULT_GODOT, GameHost, require, sha256


ROOT = Path(__file__).resolve().parents[1]
ASSEMBLY = ROOT / "runtime" / ".godot" / "mono" / "temp" / "bin" / "Debug" / "SpireCli.dll"
REPORT = ROOT / ".cache" / "room-flow-smoke.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--godot", type=Path, default=Path(os.environ.get("GODOT_BIN", DEFAULT_GODOT)))
    parser.add_argument("--dotnet-root", type=Path, default=None)
    parser.add_argument("--seed", default="WEBTEST")
    parser.add_argument("--timeout", type=float, default=90.0)
    parser.add_argument("--report", type=Path, default=REPORT)
    return parser.parse_args()


def play_fight(host: GameHost, state: dict, limit: int = 300) -> dict:
    for _ in range(limit):
        if state.get("phase") != "combat":
            return state
        playable = [card for card in state.get("hand", [])
                    if int(card.get("cost", 0)) <= int(state["player"].get("energy", 0))]
        if not playable:
            state = host.command("end")
            continue
        playable.sort(key=lambda card: (
            0 if card.get("id") == "BASH" else 1,
            0 if card.get("type") == "Attack" else 1,
            int(card.get("cost", 0)),
        ))
        card = playable[0]
        target = " 1" if card.get("targetType") in ("AnyEnemy", "AnyAlly") else ""
        state = host.command(f"play {card['index']}{target}")
    raise AssertionError(f"Combat did not settle within {limit} terminal commands: {state.get('enemies')}")


def settle_rewards_and_selectors(host: GameHost, state: dict) -> dict:
    for _ in range(180):
        prompt = state.get("prompt", "")
        if state.get("phase") == "combat":
            state = play_fight(host, state)
            continue
        if prompt.startswith("战利品"):
            state = host.command("take 1")
            continue
        if prompt.startswith("选择卡牌奖励"):
            state = host.command("choose 1")
            continue
        if state.get("phase") == "choice" and state.get("options"):
            match = re.search(r"选择 (\d+)–(\d+) 张牌", prompt)
            if match:
                count = int(match.group(1))
                state = host.command("skip" if count == 0 else
                                     "choose " + " ".join(str(index + 1) for index in range(count)))
            else:
                state = host.command("choose 1")
            continue
        return state
    raise AssertionError(f"Reward or selector flow did not settle: {state.get('prompt')}")


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
    host = GameHost(godot, dotnet_root.resolve(), ROOT / ".cache" / "room-flow-smoke-godot.log", args.timeout)
    report: dict = {
        "started_utc": datetime.now(timezone.utc).isoformat(),
        "main_cs_sha256": sha256(ROOT / "runtime" / "Main.cs"),
        "assembly_sha256": sha256(ASSEMBLY),
        "seed": args.seed,
        "commands": [],
    }
    try:
        state = host.snapshot()
        require(state.get("phase") == "ready", "Room flow host did not start cleanly")
        state = host.command(f"new ironclad {args.seed} 0")
        require(state.get("player") is not None, "Room flow test could not start an Ironclad run")

        seen: set[str] = set()
        room_checks: dict[str, dict] = {}
        for _ in range(16):
            state = settle_rewards_and_selectors(host, state)
            require(state.get("phase") not in ("error", "defeat", "victory"),
                    f"The run ended during room-flow verification: {state.get('messages')}")
            room = state.get("phase")
            seen.add(room)

            if room == "Shop":
                cash = state["player"]["gold"]
                state = host.command("shop")
                entries = []
                for message in state.get("messages", []):
                    match = re.match(r"(\d+)\. (.+?) · (\d+) 金币(.*)", message)
                    if (match and "已售罄" not in match.group(4)
                            and int(match.group(3)) <= cash and match.group(2) != "移除卡牌"):
                        entries.append((int(match.group(1)), match.group(2), int(match.group(3))))
                require(entries, "The original merchant had no stocked affordable non-removal item")
                index, name, cost = min(entries, key=lambda item: item[2])
                before = state["player"]["gold"]
                state = host.command(f"buy {index}")
                state = settle_rewards_and_selectors(host, state)
                require(state["player"]["gold"] == before - cost,
                        f"Original merchant purchase changed gold by an unexpected amount for {name}")
                stock = host.command("shop").get("messages", [])
                require(any(line.startswith(f"{index}. ") and "已售罄" in line for line in stock),
                        f"Purchased merchant entry {name} remained stocked")
                room_checks["Shop"] = {"bought": name, "cost": cost, "remaining_gold": state["player"]["gold"]}

            elif room == "Event" and not state.get("canLeave"):
                options = [option for option in state.get("options", []) if not option.get("disabled")]
                require(options, "Original event had no enabled options")
                floor = state.get("floor")
                if floor == 4:
                    state = host.command(f"choose {options[0]['index']}")
                    require(state.get("phase") == "choice" and "1–1" in state.get("prompt", ""),
                            "First WEBTEST event did not queue its original one-card selection")
                    state = host.command("choose 1")
                    require(state.get("phase") == "Event" and state.get("canLeave"),
                            "Nested event card selection did not resume the original event")
                    state = host.command("proceed")
                    require(state.get("canLeave"), "proceed failed after the original event finished")
                    room_checks["Event_single"] = {"nested_selection": True, "finished": True}
                elif floor == 5:
                    require(len(options) > 1 and "{Damage}" in options[1].get("description", ""),
                            "Raw localized event fallback did not preserve its unresolved Damage token")
                    before = state["player"]["deck"]
                    state = host.command(f"choose {options[0]['index']}")
                    require(state.get("phase") == "choice" and "2–2" in state.get("prompt", "")
                            and len(state.get("options", [])) == 8,
                            "Second WEBTEST event did not expose its original two-of-eight selection")
                    state = host.command("choose 1 2")
                    require(state.get("phase") == "Event" and state["player"]["deck"] == before + 2,
                            "Original multi-card event selection did not add exactly the selected cards")
                    require(state.get("canLeave"), "Second WEBTEST event did not finish after its nested choice")
                    room_checks["Event_multi"] = {"selected": 2, "deck_before": before,
                                                   "deck_after": state["player"]["deck"],
                                                   "raw_variable_fallback": True}
                else:
                    state = host.command(f"choose {options[0]['index']}")
                    state = settle_rewards_and_selectors(host, state)

            elif room == "RestSite":
                options = [option for option in state.get("options", []) if not option.get("disabled")]
                require(options, "The original rest site exposed no enabled options")
                before = state["player"]["hp"]
                state = host.command(f"choose {options[0]['index']}")
                require(state.get("canLeave"), "Successful original rest-site choice did not unlock travel")
                require(state["player"]["hp"] >= before, "Original rest-site action unexpectedly reduced HP")
                room_checks.setdefault("RestSite", {"hp_before": before, "hp_after": state["player"]["hp"]})

            elif room == "Treasure":
                gold_before = state["player"]["gold"]
                relic_count = len(state["player"]["relics"])
                state = host.command("open")
                state = settle_rewards_and_selectors(host, state)
                require(state["player"]["gold"] > gold_before,
                        "Opening the original treasure room did not award its normal gold")
                require(any("原版宝箱金币奖励" in message for message in state.get("messages", [])),
                        "Treasure-room command did not report the original normal reward")
                require(state.get("options"), "The original treasure room exposed no relic choices")
                state = host.command("choose 1")
                require(len(state["player"]["relics"]) == relic_count + 1,
                        "Original treasure relic pick did not award exactly one relic")
                require(state.get("canLeave"), "Picking the original treasure relic did not finish the room")
                room_checks["Treasure"] = {"gold_before": gold_before,
                                           "gold_after": state["player"]["gold"],
                                           "relics_before": relic_count,
                                           "relics_after": len(state["player"]["relics"])}

            if {"Shop", "Event", "RestSite", "Treasure"}.issubset(seen):
                break
            routes = state.get("routes", [])
            require(routes, f"No original route was available after floor {state.get('floor')}")
            priority = ["Treasure", "RestSite", "Shop", "Event", "Elite", "Monster", "Boss"]
            route = next((item for room_type in priority if room_type not in seen
                          for item in routes if item.get("name") == room_type), routes[0])
            state = host.command(f"move {route['index']}")

        require({"Shop", "Event", "RestSite", "Treasure"}.issubset(seen),
                f"WEBTEST path did not cover required rooms: {sorted(seen)}")
        require({"Shop", "Event_single", "Event_multi", "RestSite", "Treasure"}.issubset(room_checks),
                f"Room-flow assertions were incomplete: {sorted(room_checks)}")
        report["result"] = "passed"
        report["rooms_seen"] = sorted(seen)
        report["room_checks"] = room_checks
        report["commands"] = host.transcript
        report["diagnostics"] = host.diagnostics
        report["finished_utc"] = datetime.now(timezone.utc).isoformat()
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Room flow smoke passed; report: {args.report}")
        return 0
    except BaseException as exc:
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
