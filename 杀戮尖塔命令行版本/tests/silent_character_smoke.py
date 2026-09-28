#!/usr/bin/env python3
"""Verify original Silent unlock progression and character-specific run setup."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

from engine_smoke import ASSEMBLY, DEFAULT_GODOT, GameHost, require, sha256


ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / ".cache" / "silent-character-smoke.json"
sys.path.insert(0, str(ROOT))
from server import _godot_host_environment


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--godot", type=Path, default=Path(os.environ.get("GODOT_BIN", DEFAULT_GODOT)))
    parser.add_argument("--dotnet-root", type=Path, default=None)
    parser.add_argument("--timeout", type=float, default=90.0)
    parser.add_argument("--report", type=Path, default=REPORT)
    return parser.parse_args()


def verify_recovered_run_abandon(godot: Path, dotnet_root: Path, timeout: float) -> dict:
    save_dir = f"res://.cache/spirecli-silent-abandon-menu-{uuid.uuid4().hex}"
    creator = GameHost(godot, dotnet_root, ROOT / ".cache" / "silent-abandon-menu-save.log", timeout,
                       ephemeral_saves=False, save_dir=save_dir)
    abandoner = None
    try:
        state = creator.snapshot()
        require(state.get("phase") == "ready" and not state.get("hasRunSave"),
                "Saved-run abandon setup did not start with a fresh profile")
        state = creator.command("new ironclad MENUABANDON 0")
        require(state.get("player", {}).get("character") == "ironclad" and state.get("hasRunSave"),
                "Ironclad run was not saved before restarting the host")
        creator.close()

        abandoner = GameHost(godot, dotnet_root, ROOT / ".cache" / "silent-abandon-menu-run.log", timeout,
                             ephemeral_saves=False, save_dir=save_dir)
        state = abandoner.snapshot()
        require(state.get("phase") == "ready" and state.get("hasRunSave"),
                "Restart did not restore the pending run save")
        state = abandoner.command("abandon")
        require(state.get("phase") == "ready" and not state.get("hasRunSave"),
                f"Abandoning a recovered run did not return to the menu: {state}")
        require(state.get("mainMenu", {}).get("numberOfRuns") == 1
                and state.get("mainMenu", {}).get("timelineForced") is True
                and any(item.get("id") == "SILENT1_EPOCH"
                        for item in state.get("timelineCharacterUnlocks", [])),
                "Recovered-run abandon did not expose the original Silent Timeline node")
        state = abandoner.command("unlock silent")
        require(next(item for item in state["characters"] if item["id"] == "silent")["unlocked"],
                "Recovered-run abandon did not persist the Silent unlock")
        return {
            "save_dir": save_dir,
            "steps": ["start and save Ironclad", "restart host", "abandon recovered run",
                      "reveal Silent epoch"],
            "commands": abandoner.transcript,
            "diagnostics": abandoner.diagnostics,
        }
    finally:
        creator.close()
        if abandoner is not None:
            abandoner.close()


def seed_legacy_silent_epoch_state(save_dir: str) -> None:
    relative_save_dir = save_dir.removeprefix("res://")
    saves = ROOT / "runtime" / relative_save_dir / "profile1" / "saves"
    primary = saves / "progress.save"
    progress = json.loads(primary.read_text(encoding="utf-8"))
    epoch = next((item for item in progress["epochs"] if item["id"] == "SILENT1_EPOCH"), None)
    if epoch is None:
        progress["epochs"].append({"id": "SILENT1_EPOCH", "obtain_date": 0, "state": "not_obtained"})
    else:
        epoch["state"] = "not_obtained"
    contents = json.dumps(progress, ensure_ascii=False)
    primary.write_text(contents, encoding="utf-8")
    backup = saves / "progress.save.backup"
    if backup.exists():
        backup.write_text(contents, encoding="utf-8")


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
    launch_environment = _godot_host_environment(dotnet_root.resolve(), {"STS2_DEV_SKIP": "0"})
    require("STS2_DEV_SKIP" not in launch_environment
            and launch_environment.get("DOTNET_ROOT") == str(dotnet_root.resolve()),
            "The server did not remove the inherited DevSkip flag from the Godot host environment")

    args.report.parent.mkdir(parents=True, exist_ok=True)
    save_dir = f"res://.cache/spirecli-silent-character-smoke-{uuid.uuid4().hex}"
    host = GameHost(godot, dotnet_root.resolve(), ROOT / ".cache" / "silent-character-godot.log",
                    args.timeout, test_hooks=True, ephemeral_saves=False, save_dir=save_dir)
    report: dict = {
        "started_utc": datetime.now(timezone.utc).isoformat(),
        "main_cs_sha256": sha256(ROOT / "runtime" / "Main.cs"),
        "assembly_sha256": sha256(ASSEMBLY),
        "save_dir": save_dir,
        "inherited_devskip_cleared": True,
        "steps": [],
    }
    try:
        state = host.snapshot()
        characters = {item["id"]: item for item in state.get("characters", [])}
        require(state.get("phase") == "ready" and state.get("player") is None,
                f"Character menu did not start in ready state: {state}")
        require(characters.get("ironclad", {}).get("unlocked") is True,
                "Original Ironclad was not selectable")
        require(characters.get("silent", {}).get("unlocked") is False
                and not state.get("timelineCharacterUnlocks"),
                "Silent was not locked on a fresh profile")
        report["steps"].append({"step": "fresh profile menu", "ironclad_unlocked": True, "silent_locked": True})

        host.close()
        seed_legacy_silent_epoch_state(save_dir)
        host = GameHost(godot, dotnet_root.resolve(), ROOT / ".cache" / "silent-character-legacy-epoch.log",
                        args.timeout, test_hooks=True, ephemeral_saves=False, save_dir=save_dir)
        state = host.snapshot()
        progress_path = ROOT / "runtime" / save_dir.removeprefix("res://") / "profile1" / "saves" / "progress.save"
        progress = json.loads(progress_path.read_text(encoding="utf-8"))
        silent_epoch = next(item for item in progress["epochs"] if item["id"] == "SILENT1_EPOCH")
        require(silent_epoch["state"] == "obtained",
                f"Legacy Silent epoch was not promoted into the original revealable state: {silent_epoch}")
        report["steps"].append({"step": "migrate legacy Silent epoch", "epoch_state": silent_epoch["state"]})

        state = host.command("new silent LOCKEDTEST 0")
        require(state.get("messageError") and state.get("player") is None,
                f"Locked Silent incorrectly started: {state}")
        report["steps"].append({"step": "reject locked Silent", "rejected": True})

        state = host.command("new ironclad IRONCLADUNLOCK 0")
        require(state.get("player", {}).get("character") == "ironclad"
                and state.get("player", {}).get("hp") == 80
                and state.get("player", {}).get("gold") == 99
                and state.get("player", {}).get("deck") == 10,
                f"Original Ironclad starting setup differed: {state}")
        require(state.get("phase") == "Event" and state.get("options"),
                "Ironclad did not enter its original Neow opening")
        report["steps"].append({"step": "Ironclad original setup", "hp": 80, "gold": 99, "deck": 10})

        state = host.command("abandon")
        require(state.get("phase") == "defeat" and state.get("player", {}).get("hp") == 0,
                f"Abandon did not finalize through the original RunManager path: {state}")
        require(state.get("mainMenu", {}).get("numberOfRuns") == 1
                and state.get("mainMenu", {}).get("timelineForced") is True
                and state.get("mainMenu", {}).get("singleplayerEnabled") is False,
                "Abandon did not open the pending original Timeline unlock flow")
        require(any(item.get("id") == "SILENT1_EPOCH" for item in state.get("timelineCharacterUnlocks", [])),
                "Ironclad abandon did not expose the original Silent epoch for reveal")
        silent = next(item for item in state["characters"] if item["id"] == "silent")
        require(not silent["unlocked"],
                "Silent became selectable before its original Timeline epoch was revealed")
        report["steps"].append({"step": "Ironclad abandon", "silent_epoch_reveal_available": True,
                                "timeline_forced": True})

        host.close()
        host = GameHost(godot, dotnet_root.resolve(), ROOT / ".cache" / "silent-character-restart.log",
                        args.timeout, test_hooks=True, ephemeral_saves=False, save_dir=save_dir)
        state = host.snapshot()
        menu = state.get("mainMenu", {})
        require(state.get("phase") == "ready" and not state.get("hasRunSave")
                and menu.get("continueVisible") is False
                and menu.get("abandonVisible") is False
                and menu.get("timelineForced") is True
                and any(item.get("id") == "SILENT1_EPOCH"
                        for item in state.get("timelineCharacterUnlocks", [])),
                "Active-run abandon left a resumable save after restarting the host")
        report["steps"].append({"step": "restart after active abandon", "resumable_save": False,
                                "timeline_forced": True})

        state = host.command("unlock silent")
        silent = next(item for item in state["characters"] if item["id"] == "silent")
        require(silent["unlocked"], "Original Silent epoch was not revealed after its run prerequisite")
        report["steps"].append({"step": "reveal Silent epoch", "silent_unlocked": True})

        state = host.command("new silent SILENTSTART 0")
        player = state.get("player") or {}
        silent_data = next(item for item in state["characters"] if item["id"] == "silent")
        require(player.get("character") == "silent"
                and player.get("name") == silent_data.get("name")
                and player.get("hp") == 70
                and player.get("gold") == 99
                and player.get("deck") == 12,
                f"Original Silent starting setup differed: {state}")
        require(state.get("phase") == "Event" and state.get("options"),
                "Silent did not enter its original Neow opening")
        starting_relics = player.get("relics", [])
        require(starting_relics and starting_relics[0].get("name") == silent_data.get("relic"),
                f"Silent did not receive the original starting relic: {state}")
        report["steps"].append({"step": "Silent original setup", "hp": 70, "gold": 99, "deck": 12,
                                "starting_relic": silent_data.get("relic")})
        report["commands"] = host.transcript
        report["recovered_run_abandon"] = verify_recovered_run_abandon(
            godot, dotnet_root.resolve(), args.timeout)
        report["result"] = "passed"
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({"result": report["result"], "steps": report["steps"], "report": str(args.report)},
                         ensure_ascii=False, indent=2))
        return 0
    except Exception:
        report["commands"] = host.transcript
        report["diagnostics"] = host.diagnostics
        report["result"] = "failed"
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        raise
    finally:
        host.close()


if __name__ == "__main__":
    raise SystemExit(main())
