#!/usr/bin/env python3
"""Exercise the shipped web page and game commands through the Python HTTP bridge."""

from __future__ import annotations

import argparse
import http.client
import json
import os
import shutil
import signal
import socket
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from engine_smoke import DEFAULT_GODOT, ROOT, require, sha256


ASSEMBLY = ROOT / "runtime" / ".godot" / "mono" / "temp" / "bin" / "Debug" / "SpireCli.dll"
REPORT = ROOT / ".cache" / "http-smoke.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--godot", type=Path, default=Path(os.environ.get("GODOT_BIN", DEFAULT_GODOT)))
    parser.add_argument("--dotnet-root", type=Path, default=None)
    parser.add_argument("--seed", default="WEBHTTP")
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


def free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def request(port: int, method: str, path: str, *, origin: str, cookie: str | None = None,
            command: str | None = None) -> tuple[int, http.client.HTTPResponse, object]:
    headers = {"Origin": origin}
    body = None
    if cookie:
        headers["Cookie"] = cookie
    if command is not None:
        headers["Content-Type"] = "application/json"
        body = json.dumps({"command": command}, ensure_ascii=False).encode("utf-8")
    connection = http.client.HTTPConnection("127.0.0.1", port, timeout=20)
    try:
        connection.request(method, path, body=body, headers=headers)
        response = connection.getresponse()
        payload = response.read()
        content_type = response.getheader("Content-Type", "")
        value: object
        if "application/json" in content_type:
            value = json.loads(payload.decode("utf-8"))
        else:
            value = payload.decode("utf-8", errors="replace")
        return response.status, response, value
    finally:
        connection.close()


def main() -> int:
    args = parse_args()
    godot = args.godot.expanduser().resolve()
    dotnet_root = find_dotnet_root(args.dotnet_root).expanduser().resolve()
    require(godot.is_file() and os.access(godot, os.X_OK), f"Godot is not executable: {godot}")
    require(ASSEMBLY.is_file(), f"Build the runtime first; missing {ASSEMBLY}")
    require(ASSEMBLY.stat().st_mtime_ns >= (ROOT / "runtime" / "Main.cs").stat().st_mtime_ns,
            "The runtime assembly is older than Main.cs; rebuild before the smoke test")

    port = free_port()
    origin = f"http://127.0.0.1:{port}"
    save_dir = f"res://.cache/spirecli-http-smoke-{time.time_ns()}"
    log_path = ROOT / ".cache" / "http-smoke-server.log"
    args.report.parent.mkdir(parents=True, exist_ok=True)
    report: dict = {
        "started_utc": datetime.now(timezone.utc).isoformat(),
        "seed": args.seed,
        "save_dir": save_dir,
        "main_cs_sha256": sha256(ROOT / "runtime" / "Main.cs"),
        "assembly_sha256": sha256(ASSEMBLY),
        "commands": [],
    }
    environment = os.environ.copy()
    environment["DOTNET_ROOT"] = str(dotnet_root)
    environment["SPIRECLI_SAVE_DIR"] = save_dir
    environment.pop("SPIRECLI_EPHEMERAL_SAVES", None)
    server = None
    log_stream = log_path.open("w", encoding="utf-8")
    try:
        server = subprocess.Popen(
            [
                sys.executable,
                str(ROOT / "server.py"),
                "--host", "127.0.0.1",
                "--port", str(port),
                "--godot", str(godot),
                "--dotnet-root", str(dotnet_root),
                "--startup-timeout", str(args.timeout),
                "--command-timeout", str(args.timeout),
            ],
            cwd=ROOT,
            env=environment,
            stdout=log_stream,
            stderr=subprocess.STDOUT,
            text=True,
        )

        page = None
        deadline = time.monotonic() + args.timeout
        while time.monotonic() < deadline:
            if server.poll() is not None:
                raise RuntimeError(f"HTTP bridge exited with {server.returncode}: {log_path.read_text(encoding='utf-8')[-4000:]}")
            try:
                status, _, page = request(port, "GET", "/", origin=origin)
                if status == 200:
                    break
            except OSError:
                time.sleep(0.1)
        require(isinstance(page, str), f"Web page did not load; see {log_path}")
        require("id=\"command-form\"" in page and "id=\"command\"" in page and "游戏命令终端" in page,
                "Served page is missing its built-in command terminal")
        status, _, script = request(port, "GET", "/app.js", origin=origin)
        require(status == 200 and isinstance(script, str) and 'fetch("/api/command"' in script,
                "Served frontend script is not wired to the Python command endpoint")

        status, response, state = request(port, "GET", "/api/state", origin=origin)
        require(status == 200 and isinstance(state, dict), f"Initial HTTP state request failed: {state}")
        cookie_header = response.getheader("Set-Cookie") or ""
        cookie = cookie_header.split(";", 1)[0]
        require(cookie.startswith("spire_session="), "HTTP bridge did not create a browser session cookie")
        require(state.get("phase") == "ready" and state.get("engineMode") == "TestMode/headless",
                "HTTP session did not start the expected original engine host")

        def command(value: str) -> dict:
            status, _, snapshot = request(port, "POST", "/api/command", origin=origin, cookie=cookie, command=value)
            require(status == 200 and isinstance(snapshot, dict), f"HTTP command {value!r} failed: {snapshot}")
            report["commands"].append({"command": value, "phase": snapshot.get("phase"), "prompt": snapshot.get("prompt")})
            return snapshot

        state = command("help")
        require(any("new ironclad" in message for message in state.get("messages", [])),
                "Built-in help command did not return Ironclad start syntax")
        state = command(f"new ironclad {args.seed} 0")
        monster = next((route for route in state.get("routes", []) if route.get("name") == "Monster"), None)
        require(state.get("phase", "").casefold() == "map" and monster is not None,
                "HTTP new command did not expose a Monster route")
        state = command(f"move {monster['index']}")
        require(state.get("phase") == "combat" and state.get("hand"), "HTTP move command did not enter combat")

        attack = next((card for card in state["hand"]
                       if card.get("targetType") == "AnyEnemy"
                       and int(card.get("cost", 0)) <= int(state["player"].get("energy", 0))), None)
        require(attack is not None, "HTTP test opening hand has no playable single-enemy attack")
        state = command(f"play {attack['index']} 1")
        require(state.get("phase") == "combat", "HTTP play command left combat unexpectedly")
        state = command("end")
        require(state.get("phase") == "combat" and int(state.get("player", {}).get("turn", 0)) >= 2,
                "HTTP end command did not advance the original combat turn")
        state = command("abandon")
        require(state.get("phase") == "ready" and not state.get("hasRunSave"),
                "HTTP abandon command did not clear the terminal session's run")

        report["result"] = "passed"
        report["http_status"] = 200
        report["phases"] = ["ready", "map", "combat", "combat", "ready"]
        return 0
    except BaseException as exc:
        report["result"] = "failed"
        report["failure"] = f"{type(exc).__name__}: {exc}"
        if server is not None and server.poll() is None:
            report["server_pid"] = server.pid
        raise
    finally:
        if server is not None and server.poll() is None:
            server.send_signal(signal.SIGINT)
            try:
                server.wait(timeout=8)
            except subprocess.TimeoutExpired:
                server.terminate()
                try:
                    server.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    server.kill()
                    server.wait(timeout=3)
        if save_dir.startswith("res://.cache/spirecli-http-smoke-"):
            isolated_dir = ROOT / "runtime" / ".cache" / save_dir.rsplit("/", 1)[-1]
            if isolated_dir.parent.resolve() == (ROOT / "runtime" / ".cache").resolve():
                shutil.rmtree(isolated_dir, ignore_errors=True)
        log_stream.close()
        report["finished_utc"] = datetime.now(timezone.utc).isoformat()
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"HTTP smoke {report.get('result', 'failed')}; report: {args.report}")


if __name__ == "__main__":
    raise SystemExit(main())
