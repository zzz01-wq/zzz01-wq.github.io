#!/usr/bin/env python3
"""Check timeline reveal eligibility and the original Potion Lab buckets."""

from __future__ import annotations

import argparse
import json
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path

from engine_smoke import ASSEMBLY, DEFAULT_GODOT, GameHost, require, sha256


ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / ".cache" / "timeline-compendium-smoke.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--godot", type=Path, default=Path(os.environ.get("GODOT_BIN", DEFAULT_GODOT)))
    parser.add_argument("--dotnet-root", type=Path, default=None)
    parser.add_argument("--timeout", type=float, default=90.0)
    parser.add_argument("--report", type=Path, default=REPORT)
    return parser.parse_args()


def timeline_nodes(state: dict) -> list[dict]:
    return [node for era in state.get("timelineEpochs", []) for node in era.get("nodes", [])]


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
    host = GameHost(godot, dotnet_root.resolve(), ROOT / ".cache" / "timeline-compendium-godot.log",
                    args.timeout, ephemeral_saves=True)
    report: dict = {
        "started_utc": datetime.now(timezone.utc).isoformat(),
        "main_cs_sha256": sha256(ROOT / "runtime" / "Main.cs"),
        "assembly_sha256": sha256(ASSEMBLY),
        "steps": [],
    }
    try:
        state = host.snapshot()
        require(state.get("phase") == "ready" and state.get("player") is None,
                f"Host did not start at the menu: {state}")

        state = host.command("compendium open")
        require(not state.get("messageError"), f"Opening the compendium failed: {state.get('messages')}")
        data = state.get("compendiumData") or {}
        potions = data.get("potions", [])
        require(potions, "The Potion Lab returned no original potion entries")
        require(all(isinstance(potion.get("rarity"), str) and potion["rarity"].strip() for potion in potions),
                "A Potion Lab entry has no localized rarity")
        require((data.get("sections") or [])[2].get("count") == len(potions),
                "Potion Lab section count does not match its visible rarity buckets")
        report["steps"].append({"step": "open Potion Lab", "visible_potions": len(potions),
                                "all_rarities_localized": True,
                                "native_buckets": ["Common", "Uncommon", "Rare", "Event", "Token"]})

        state = host.command("compendium close")
        state = host.command("new ironclad TIMELINEPARITY 0")
        require(state.get("player", {}).get("character") == "ironclad",
                "Ironclad did not start for the timeline unlock check")
        state = host.command("abandon")
        require(any(item.get("id") == "SILENT1_EPOCH"
                    for item in state.get("timelineCharacterUnlocks", [])),
                "Original Ironclad run completion did not provide the Silent epoch")

        state = host.command("timeline open")
        epoch = next((node for node in timeline_nodes(state) if node.get("id") == "SILENT1_EPOCH"), None)
        require(epoch is not None and epoch.get("state") == "obtained" and epoch.get("canReveal") is True,
                f"The earned but unrevealed Silent epoch was not presented as clickable: {epoch}")
        locked_epoch = next((node for node in timeline_nodes(state) if node.get("state") == "locked"), None)
        require(locked_epoch is not None and locked_epoch.get("canReveal") is False,
                "The timeline did not expose a locked, non-revealable node for the negative check")
        state = host.command("reveal " + locked_epoch["id"])
        require(state.get("messageError") is True,
                f"A not-obtained epoch was revealed: {locked_epoch}")
        state = host.command("timeline open")
        locked_epoch = next((node for node in timeline_nodes(state) if node.get("id") == locked_epoch["id"]), None)
        require(locked_epoch is not None and locked_epoch.get("state") == "locked",
                f"A rejected reveal changed the not-obtained epoch: {locked_epoch}")
        epoch = next((node for node in timeline_nodes(state) if node.get("id") == "SILENT1_EPOCH"), None)
        require(epoch is not None and epoch.get("state") == "obtained" and epoch.get("canReveal") is True,
                f"The earned epoch changed while rejecting an unrelated locked node: {epoch}")
        state = host.command("reveal SILENT1_EPOCH")
        require(not state.get("messageError"), f"Revealing an earned epoch failed: {state.get('messages')}")
        state = host.command("timeline open")
        epoch = next((node for node in timeline_nodes(state) if node.get("id") == "SILENT1_EPOCH"), None)
        require(epoch is not None and epoch.get("state") == "revealed",
                f"Revealing an earned epoch did not persist its state: {epoch}")
        silent = next((item for item in state.get("characters", []) if item.get("id") == "silent"), None)
        require(silent is not None and silent.get("unlocked") is True,
                "Revealing the original Silent epoch did not unlock Silent")

        app_js = (ROOT / "web" / "app.js").read_text(encoding="utf-8")
        reveal_renderer = app_js.split('function renderTimelinePage(s, labels)', 1)[1].split(
            'function layoutTimelineAxis(board)', 1)[0]
        require('const canReveal = node.state === "obtained" && node.canReveal;' in reveal_renderer
                and 'if (canReveal) {' in reveal_renderer
                and 'button.dataset.menuAction = "reveal-epoch";' in reveal_renderer
                and '} else if (revealed) {' in reveal_renderer,
                "Timeline click wiring no longer limits reveal actions to obtained/revealable epochs")
        reveal_action = app_js.split('} else if (action === "reveal-epoch") {', 1)[1].split(
            '} else if (action === "back") {', 1)[0]
        require('await send("reveal " + epochId);' in reveal_action,
                "Clicking an eligible epoch no longer invokes the reveal command")
        report["steps"].append({"step": "timeline reveal parity",
                                "eligible_click_reveals_immediately": True,
                                "not_obtained_epoch_stays_locked": True,
                                "revealed_epoch_unlocks_character": True,
                                "web_click_routes_through_original_progress_adapter": True})
        report["original_behavior"] = {
            "obtained_unrevealed_epoch": "clicking it immediately reveals it",
            "not_obtained_epoch": "does not reveal on a normal click",
            "basis": [
                ".cache/source/MegaCrit.Sts2.Core.Nodes.Screens.Timeline/NEpochSlot.cs:OnRelease",
                ".cache/source/MegaCrit.Sts2.Core.Nodes.Screens.Timeline/NEpochSlot.cs:RevealEpoch",
                ".cache/source/MegaCrit.Sts2.Core.Nodes.Screens.Timeline/NEpochInspectScreen.cs:UnlockAnimation",
                ".cache/source/MegaCrit.Sts2.Core.Nodes.Screens.PotionLab/NPotionLab.cs:LoadPotions",
                ".cache/source/MegaCrit.Sts2.Core.Nodes.Screens.PotionLab/NPotionLabCategory.cs:LoadPotions",
            ],
        }
        report["commands"] = host.transcript
        report["diagnostics"] = host.diagnostics
        report["result"] = "passed"
        report["finished_utc"] = datetime.now(timezone.utc).isoformat()
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({"result": report["result"], "steps": report["steps"], "report": str(args.report)},
                         ensure_ascii=False, indent=2))
        return 0
    except BaseException:
        report["commands"] = host.transcript
        report["diagnostics"] = host.diagnostics
        report["result"] = "failed"
        report["finished_utc"] = datetime.now(timezone.utc).isoformat()
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        raise
    finally:
        host.close()


if __name__ == "__main__":
    raise SystemExit(main())
