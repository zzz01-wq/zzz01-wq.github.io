#!/usr/bin/env python3
"""Exercise queued card, bundle, and relic choices with isolated test hooks."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

from engine_smoke import DEFAULT_GODOT, GameHost, require, sha256


ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / ".cache" / "choice-adapters-smoke.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--godot", type=Path, default=Path(os.environ.get("GODOT_BIN", DEFAULT_GODOT)))
    parser.add_argument("--dotnet-root", type=Path, default=None)
    parser.add_argument("--timeout", type=float, default=60.0)
    parser.add_argument("--report", type=Path, default=REPORT)
    return parser.parse_args()


def find_dotnet_root(configured: Path | None) -> Path:
    if configured is not None:
        return configured
    env_root = os.environ.get("DOTNET_ROOT")
    if env_root:
        return Path(env_root)
    dotnet = shutil.which("dotnet")
    if dotnet:
        return Path(dotnet).resolve().parent
    raise RuntimeError("Set DOTNET_ROOT or pass --dotnet-root")


def main() -> int:
    args = parse_args()
    godot = args.godot.expanduser().resolve()
    dotnet_root = find_dotnet_root(args.dotnet_root).expanduser().resolve()
    assembly = ROOT / "runtime" / ".godot" / "mono" / "temp" / "bin" / "Debug" / "SpireCli.dll"
    require(godot.is_file() and os.access(godot, os.X_OK), f"Godot is not executable: {godot}")
    require(assembly.is_file(), f"Build the runtime first; missing {assembly}")
    require(assembly.stat().st_mtime_ns >= (ROOT / "runtime" / "Main.cs").stat().st_mtime_ns,
            "The runtime assembly is older than Main.cs; rebuild before the smoke test")

    args.report.parent.mkdir(parents=True, exist_ok=True)
    log_path = ROOT / ".cache" / "choice-adapters-godot.log"
    host = GameHost(godot, dotnet_root, log_path, args.timeout, test_hooks=True)
    report: dict = {
        "started_utc": datetime.now(timezone.utc).isoformat(),
        "main_cs_sha256": sha256(ROOT / "runtime" / "Main.cs"),
        "assembly_sha256": sha256(assembly),
        "commands": [],
    }
    try:
        state = host.snapshot()
        require(state.get("phase") == "ready", "Choice test host did not start cleanly")
        state = host.command("new ironclad CHOICEFLOW 0")
        require(state.get("player") is not None, "Choice test host could not start an Ironclad run")
        before = {key: state["player"][key] for key in ("hp", "gold", "deck")}

        state = host.command("__test_select multi")
        require(state.get("phase") == "choice" and len(state.get("options", [])) == 5,
                "Multi-select request was not queued with its original candidate list")
        state = host.command("choose 1 3")
        require(any("test selection multi selected:" in message for message in state.get("messages", [])),
                "Multi-select did not return the chosen original card models")

        state = host.command("__test_select optional")
        require(state.get("phase") == "choice" and "0–3" in state.get("prompt", ""),
                "Optional selection did not expose the original zero-to-three range")
        state = host.command("skip")
        require(any(message.endswith("selected: ") for message in state.get("messages", [])),
                "Optional selection did not return an empty selection")

        state = host.command("__test_nested")
        require(state.get("phase") == "choice" and len(state.get("options", [])) == 3,
                "The first queued nested selection was not shown")
        state = host.command("choose 2")
        require(state.get("phase") == "choice" and len(state.get("options", [])) == 3,
                "The second queued nested selection did not become active")
        state = host.command("choose 1 2")
        require(any("test nested selections:" in message for message in state.get("messages", [])),
                "Nested selections did not resume in request order")

        state = host.command("__test_bundle")
        require(state.get("phase") == "choice" and len(state.get("options", [])) == 2,
                "Patched CardSelectCmd did not wait for a bundle command")
        require("组合 2" in state["options"][1].get("name", "") and state["options"][1].get("description"),
                "Bundle display omitted the original cards in the bundle")
        state = host.command("choose 2")
        require(any("test bundle selected:" in message for message in state.get("messages", [])),
                "Bundle selection did not return the chosen original bundle")

        state = host.command("__test_relic")
        require(state.get("phase") == "choice" and len(state.get("options", [])) == 3,
                "Patched RelicSelectCmd did not expose the original relic candidates")
        state = host.command("choose 2")
        require(any("test relic selected:" in message for message in state.get("messages", [])),
                "Relic selection did not resume the original caller")
        after = {key: state["player"][key] for key in ("hp", "gold", "deck")}
        require(before == after, "Selection adapter probes changed player combat or deck state")

        state = host.command("abandon")
        require(state.get("player") is None and state.get("phase") == "ready",
                "Choice test host could not reset the isolated run")
        report["commands"] = host.transcript
        report["result"] = "passed"
        report["finished_utc"] = datetime.now(timezone.utc).isoformat()
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Choice adapter smoke passed; report: {args.report}")
        return 0
    except BaseException as exc:
        report["commands"] = host.transcript
        report["result"] = "failed"
        report["failure"] = f"{type(exc).__name__}: {exc}"
        report["diagnostics"] = host.diagnostics
        report["finished_utc"] = datetime.now(timezone.utc).isoformat()
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Choice adapter smoke failed; report: {args.report}", file=sys.stderr)
        raise
    finally:
        host.close()


if __name__ == "__main__":
    raise SystemExit(main())
