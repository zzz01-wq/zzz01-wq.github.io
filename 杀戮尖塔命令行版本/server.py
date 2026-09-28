#!/usr/bin/env python3
"""Loopback-only HTTP bridge between the web terminal and the original game host."""

from __future__ import annotations

import argparse
import fcntl
import json
import mimetypes
import os
import queue
import re
import secrets
import shutil
import signal
import socket
import subprocess
import sys
import threading
import time
from collections import deque
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parent
RUNTIME = ROOT / "runtime"
WEB = ROOT / "web"
LOG_DIR = ROOT / ".cache" / "service-logs"
BUILD_LOCK = ROOT / ".cache" / "runtime-build.lock"
COOKIE_NAME = "spire_session"
SNAPSHOT_PREFIX = "@@SPIRE@@"
MAX_BODY_BYTES = 4096
MAX_COMMAND_CHARS = 512
MAX_SNAPSHOT_LINE = 2 * 1024 * 1024
DEFAULT_GODOT = ROOT / ".tools" / "godot" / "Godot_mono.app" / "Contents" / "MacOS" / "Godot"

# Intentionally explicit. The server never maps an arbitrary URL path to a file.
STATIC_FILES = {
    "/": "index.html",
    "/index.html": "index.html",
    "/style.css": "style.css",
    "/app.js": "app.js",
}


class ServiceError(Exception):
    def __init__(self, status: int, code: str, message: str, *, reset_cookie: bool = False):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.reset_cookie = reset_cookie


def _resolve_dotnet_root(explicit: str | None = None) -> Path:
    candidates: list[Path] = []
    if explicit:
        candidates.append(Path(explicit).expanduser())
    elif os.environ.get("DOTNET_ROOT"):
        candidates.append(Path(os.environ["DOTNET_ROOT"]).expanduser())
    else:
        executable = shutil.which("dotnet")
        if executable:
            candidates.append(Path(executable).resolve().parent)
    for candidate in candidates:
        if (candidate / "dotnet").exists() or (candidate / "host" / "fxr").is_dir():
            return candidate.resolve()
    raise ServiceError(
        HTTPStatus.SERVICE_UNAVAILABLE,
        "dotnet_missing",
        "找不到 .NET SDK/运行时。请安装项目要求的 .NET 10 SDK，并设置 DOTNET_ROOT 后重启服务。",
    )


def _godot_host_environment(dotnet_root: Path, parent: dict[str, str] | None = None) -> dict[str, str]:
    environment = dict(os.environ if parent is None else parent)
    # The game enables DevSkip when this variable exists, even if its value is
    # "0". Keep the web host's original Timeline unlock flow independent from
    # whichever shell or launcher started the Python server.
    environment.pop("STS2_DEV_SKIP", None)
    environment["DOTNET_ROOT"] = str(dotnet_root)
    environment.setdefault("DOTNET_CLI_TELEMETRY_OPTOUT", "1")
    return environment


def _snapshot_from_line(line: str) -> dict:
    payload = line[len(SNAPSHOT_PREFIX) :].strip()
    try:
        result = json.loads(payload)
    except json.JSONDecodeError as exc:
        raise RuntimeError("游戏主机返回了无效快照") from exc
    if not isinstance(result, dict):
        raise RuntimeError("游戏主机快照不是 JSON 对象")
    return result


class GameSession:
    """One fixed Godot host process and its latest in-memory snapshot."""

    def __init__(
        self,
        session_id: str,
        *,
        godot: Path,
        dotnet_root: Path,
        startup_timeout: float,
        command_timeout: float,
    ) -> None:
        self.session_id = session_id
        self.godot = godot
        self.dotnet_root = dotnet_root
        self.startup_timeout = startup_timeout
        self.command_timeout = command_timeout
        self.command_lock = threading.Lock()
        self._output: queue.Queue[str | None] = queue.Queue()
        self._diagnostics: deque[str] = deque(maxlen=40)
        self._diag_lock = threading.Lock()
        self.process: subprocess.Popen[str] | None = None
        self.snapshot: dict | None = None
        self.started_at = time.monotonic()
        self.last_activity = self.started_at
        self.closed = False
        self._close_lock = threading.Lock()

    def start(self) -> dict:
        if self.process is not None:
            assert self.snapshot is not None
            return self.snapshot
        self._validate_runtime()
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        log_path = LOG_DIR / f"godot-{self.session_id[:12]}.log"
        environment = _godot_host_environment(self.dotnet_root)
        command = [
            str(self.godot),
            "--headless",
            "--path",
            str(RUNTIME),
            "--log-file",
            str(log_path),
        ]
        try:
            self.process = subprocess.Popen(
                command,
                cwd=ROOT,
                env=environment,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding="utf-8",
                errors="replace",
                bufsize=1,
                start_new_session=True,
            )
        except OSError as exc:
            raise ServiceError(
                HTTPStatus.SERVICE_UNAVAILABLE,
                "engine_start_failed",
                "无法启动 Godot 游戏主机。请确认已安装 Godot Mono 4.5.1，并运行 tools/build_runtime.py。",
            ) from exc

        threading.Thread(target=self._read_stdout, name=f"spire-out-{self.session_id[:8]}", daemon=True).start()
        threading.Thread(target=self._read_stderr, name=f"spire-err-{self.session_id[:8]}", daemon=True).start()
        try:
            self.snapshot = self._wait_snapshot(self.startup_timeout)
            self.last_activity = time.monotonic()
            return self.snapshot
        except ServiceError:
            self.close()
            raise

    def _validate_runtime(self) -> None:
        if not self.godot.is_file() or not os.access(self.godot, os.X_OK):
            raise ServiceError(
                HTTPStatus.SERVICE_UNAVAILABLE,
                "godot_missing",
                "找不到可执行的 Godot Mono 4.5.1。请将引擎放到 .tools/godot/Godot_mono.app，或使用 --godot 指定路径。",
            )
        project = RUNTIME / "project.godot"
        assembly = RUNTIME / ".godot" / "mono" / "temp" / "bin" / "Debug" / "SpireCli.dll"
        if not project.is_file() or not assembly.is_file():
            raise ServiceError(
                HTTPStatus.SERVICE_UNAVAILABLE,
                "runtime_not_built",
                "游戏主机尚未准备好。请先运行 `python3 tools/build_runtime.py`，并确认本机已有原版 reference 资源。",
            )
        try:
            version = subprocess.run(
                [str(self.godot), "--version"],
                cwd=ROOT,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                timeout=8,
                check=False,
            ).stdout
        except (OSError, subprocess.TimeoutExpired) as exc:
            raise ServiceError(
                HTTPStatus.SERVICE_UNAVAILABLE,
                "godot_check_failed",
                "无法读取 Godot 版本。请确认指定的是 Godot Mono 4.5.1 可执行文件。",
            ) from exc
        if "4.5.1" not in version or ".mono." not in version:
            raise ServiceError(
                HTTPStatus.SERVICE_UNAVAILABLE,
                "godot_version_mismatch",
                "运行时要求 Godot Mono 4.5.1；当前 Godot 版本不匹配。",
            )

    def _read_stdout(self) -> None:
        process = self.process
        assert process is not None and process.stdout is not None
        try:
            while True:
                line = process.stdout.readline(MAX_SNAPSHOT_LINE + 1)
                if not line:
                    break
                if len(line) > MAX_SNAPSHOT_LINE:
                    self._output.put("__SPIRE_LINE_TOO_LARGE__")
                    break
                line = line.rstrip("\r\n")
                if line.startswith(SNAPSHOT_PREFIX):
                    self._output.put(line)
                else:
                    self._remember_diagnostic(line)
        except (OSError, ValueError) as exc:
            self._remember_diagnostic(f"stdout reader failed: {exc}")
        finally:
            self._output.put(None)

    def _read_stderr(self) -> None:
        process = self.process
        assert process is not None and process.stderr is not None
        try:
            for line in process.stderr:
                self._remember_diagnostic(line.rstrip("\r\n"))
        except (OSError, ValueError) as exc:
            self._remember_diagnostic(f"stderr reader failed: {exc}")

    def _remember_diagnostic(self, line: str) -> None:
        if line:
            with self._diag_lock:
                self._diagnostics.append(line[-1200:])

    def _wait_snapshot(self, timeout: float) -> dict:
        deadline = time.monotonic() + timeout
        while True:
            process = self.process
            if process is None or process.poll() is not None:
                raise ServiceError(
                    HTTPStatus.SERVICE_UNAVAILABLE,
                    "engine_stopped",
                    "游戏主机在返回状态前退出。请检查本机 Godot/.NET 与原版依赖后重试。",
                    reset_cookie=True,
                )
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise ServiceError(
                    HTTPStatus.GATEWAY_TIMEOUT,
                    "engine_timeout",
                    "等待游戏主机状态超时。本次会话已关闭；请检查原版依赖后刷新页面。",
                    reset_cookie=True,
                )
            try:
                line = self._output.get(timeout=min(remaining, 0.5))
            except queue.Empty:
                continue
            if line is None:
                raise ServiceError(
                    HTTPStatus.SERVICE_UNAVAILABLE,
                    "engine_stopped",
                    "游戏主机已退出，无法读取当前状态。请刷新页面重新启动会话。",
                    reset_cookie=True,
                )
            if line == "__SPIRE_LINE_TOO_LARGE__":
                raise ServiceError(
                    HTTPStatus.BAD_GATEWAY,
                    "engine_response_too_large",
                    "游戏主机返回了过大的状态数据，会话已关闭。",
                    reset_cookie=True,
                )
            try:
                return _snapshot_from_line(line)
            except RuntimeError as exc:
                self._remember_diagnostic(str(exc))
                raise ServiceError(
                    HTTPStatus.BAD_GATEWAY,
                    "engine_invalid_response",
                    "游戏主机返回的状态无法解析，会话已关闭。",
                    reset_cookie=True,
                ) from exc

    def read_state(self) -> dict:
        with self.command_lock:
            self._ensure_running()
            self.last_activity = time.monotonic()
            assert self.snapshot is not None
            return self.snapshot

    def execute(self, command: str) -> dict:
        # Waiting here serializes browser requests for a session. Each response consumes
        # exactly one snapshot, so a late response can never be assigned to a later POST.
        if not self.command_lock.acquire(timeout=self.command_timeout):
            raise ServiceError(HTTPStatus.CONFLICT, "session_busy", "该会话仍在处理上一条命令，请稍后重试。")
        try:
            self._ensure_running()
            process = self.process
            assert process is not None and process.stdin is not None
            if process.poll() is not None:
                raise self._stopped_error()
            try:
                process.stdin.write(command + "\n")
                process.stdin.flush()
            except (BrokenPipeError, OSError, ValueError) as exc:
                self.close()
                raise self._stopped_error() from exc
            try:
                self.snapshot = self._wait_snapshot(self.command_timeout)
            except ServiceError as exc:
                # A command may still complete after an HTTP timeout. Kill and remove its
                # process so no delayed @@SPIRE@@ line can satisfy another request.
                self.close()
                exc.reset_cookie = True
                raise
            self.last_activity = time.monotonic()
            return self.snapshot
        finally:
            self.command_lock.release()

    def _ensure_running(self) -> None:
        if self.closed or self.process is None:
            raise self._stopped_error()
        if self.process.poll() is not None:
            self.close()
            raise self._stopped_error()

    @staticmethod
    def _stopped_error() -> ServiceError:
        return ServiceError(
            HTTPStatus.SERVICE_UNAVAILABLE,
            "engine_stopped",
            "游戏主机已停止。刷新页面可以启动新的会话。",
            reset_cookie=True,
        )

    def close(self) -> None:
        with self._close_lock:
            if self.closed:
                return
            self.closed = True
            process = self.process
            if process is None:
                return
            try:
                if process.stdin:
                    process.stdin.close()
            except (OSError, ValueError):
                pass
            if process.poll() is None:
                try:
                    process.terminate()
                    process.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    process.kill()
                    try:
                        process.wait(timeout=2)
                    except subprocess.TimeoutExpired:
                        pass
                except OSError:
                    pass
            for stream in (process.stdout, process.stderr):
                try:
                    if stream:
                        stream.close()
                except OSError:
                    pass


class SessionManager:
    def __init__(
        self,
        *,
        godot: Path,
        dotnet_root: Path,
        max_sessions: int,
        idle_timeout: float,
        startup_timeout: float,
        command_timeout: float,
    ) -> None:
        self.godot = godot
        self.dotnet_root = dotnet_root
        self.max_sessions = max_sessions
        self.idle_timeout = idle_timeout
        self.startup_timeout = startup_timeout
        self.command_timeout = command_timeout
        self._sessions: dict[str, GameSession] = {}
        self._lock = threading.RLock()
        self._stop = threading.Event()
        self._reaper = threading.Thread(target=self._reap_loop, name="spire-session-reaper", daemon=True)
        self._reaper.start()

    def find(self, session_id: str | None) -> GameSession | None:
        if not session_id:
            return None
        with self._lock:
            return self._sessions.get(session_id)

    def create(self) -> tuple[str, GameSession]:
        self.reap_idle()
        with self._lock:
            if len(self._sessions) >= self.max_sessions:
                raise ServiceError(
                    HTTPStatus.SERVICE_UNAVAILABLE,
                    "session_capacity",
                    "本机游戏会话已满。关闭一段时间未使用的页面后再试。",
                )
            session_id = secrets.token_urlsafe(32)
            session = GameSession(
                session_id,
                godot=self.godot,
                dotnet_root=self.dotnet_root,
                startup_timeout=self.startup_timeout,
                command_timeout=self.command_timeout,
            )
            self._sessions[session_id] = session
        try:
            # Runtime setup/build takes an exclusive lock. Hold a shared lock until the
            # host has loaded the copied assemblies and published its initial snapshot.
            BUILD_LOCK.parent.mkdir(parents=True, exist_ok=True)
            with BUILD_LOCK.open("a+b") as lock_stream:
                fcntl.flock(lock_stream.fileno(), fcntl.LOCK_SH)
                session.start()
                fcntl.flock(lock_stream.fileno(), fcntl.LOCK_UN)
        except ServiceError:
            self.remove(session_id, session)
            raise
        except OSError as exc:
            self.remove(session_id, session)
            raise ServiceError(
                HTTPStatus.SERVICE_UNAVAILABLE,
                "engine_start_failed",
                "无法准备游戏主机。请检查本机文件权限和运行时依赖。",
            ) from exc
        return session_id, session

    def remove(self, session_id: str, expected: GameSession | None = None) -> None:
        with self._lock:
            session = self._sessions.get(session_id)
            if session is not None and (expected is None or session is expected):
                self._sessions.pop(session_id, None)
            else:
                session = None
        if session:
            session.close()

    def remove_by_session(self, session: GameSession) -> None:
        self.remove(session.session_id, session)

    def reap_idle(self) -> None:
        now = time.monotonic()
        with self._lock:
            candidates = [
                (session_id, session)
                for session_id, session in self._sessions.items()
                if now - session.last_activity >= self.idle_timeout
            ]
        for session_id, session in candidates:
            if session.command_lock.acquire(blocking=False):
                try:
                    if time.monotonic() - session.last_activity >= self.idle_timeout:
                        self.remove(session_id, session)
                finally:
                    session.command_lock.release()

    def _reap_loop(self) -> None:
        while not self._stop.wait(min(30.0, max(1.0, self.idle_timeout / 4.0))):
            self.reap_idle()

    def close_all(self) -> None:
        self._stop.set()
        with self._lock:
            sessions = list(self._sessions.items())
            self._sessions.clear()
        for _, session in sessions:
            session.close()


class LocalServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self, address, handler, manager: SessionManager, *, allowed_hosts: set[str]):
        self.manager = manager
        self.allowed_hosts = {item.casefold() for item in allowed_hosts}
        super().__init__(address, handler)


class RequestHandler(BaseHTTPRequestHandler):
    server: LocalServer
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt: str, *args) -> None:
        # The service is intended for one local user; keep access logs compact.
        sys.stderr.write(f"[http] {self.log_date_time_string()} {fmt % args}\n")

    def do_GET(self) -> None:
        route = urlsplit(self.path).path
        if route in STATIC_FILES:
            self._static(STATIC_FILES[route])
            return
        if route == "/api/state":
            try:
                self._check_same_origin()
                session_id = self._read_cookie()
                session = self.server.manager.find(session_id)
                created = False
                if session is None:
                    session_id, session = self.server.manager.create()
                    created = True
                try:
                    snapshot = session.read_state()
                except ServiceError as exc:
                    if exc.reset_cookie:
                        self.server.manager.remove_by_session(session)
                    raise
                headers = {"Cache-Control": "no-store"}
                if created:
                    headers["Set-Cookie"] = self._set_cookie(session_id)
                self._json(HTTPStatus.OK, snapshot, headers)
            except ServiceError as exc:
                self._service_error(exc)
            return
        self._json(HTTPStatus.NOT_FOUND, {"error": "未找到该地址。", "code": "not_found"})

    def do_POST(self) -> None:
        if urlsplit(self.path).path != "/api/command":
            self._json(HTTPStatus.NOT_FOUND, {"error": "未找到该地址。", "code": "not_found"})
            return
        try:
            self._check_same_origin()
            command = self._read_command()
            session_id = self._read_cookie()
            session = self.server.manager.find(session_id)
            created = False
            if session is None:
                session_id, session = self.server.manager.create()
                created = True
            try:
                snapshot = session.execute(command)
            except ServiceError as exc:
                if exc.reset_cookie:
                    self.server.manager.remove_by_session(session)
                raise
            headers = {"Cache-Control": "no-store"}
            if created:
                headers["Set-Cookie"] = self._set_cookie(session_id)
            self._json(HTTPStatus.OK, snapshot, headers)
        except ServiceError as exc:
            self._service_error(exc)

    def do_HEAD(self) -> None:
        if urlsplit(self.path).path in STATIC_FILES:
            self._static(STATIC_FILES[urlsplit(self.path).path], head_only=True)
        else:
            self._json(HTTPStatus.NOT_FOUND, {"error": "未找到该地址。", "code": "not_found"}, head_only=True)

    def do_PUT(self) -> None:
        self._method_not_allowed("GET, POST, HEAD")

    def do_DELETE(self) -> None:
        self._method_not_allowed("GET, POST, HEAD")

    def do_OPTIONS(self) -> None:
        self._method_not_allowed("GET, POST, HEAD")

    def _method_not_allowed(self, allowed: str) -> None:
        self._json(
            HTTPStatus.METHOD_NOT_ALLOWED,
            {"error": "此 HTTP 方法不可用。", "code": "method_not_allowed"},
            {"Allow": allowed},
        )

    def _read_cookie(self) -> str | None:
        raw = self.headers.get("Cookie", "")
        if len(raw) > 4096:
            return None
        parsed = SimpleCookie()
        try:
            parsed.load(raw)
        except Exception:
            return None
        morsel = parsed.get(COOKIE_NAME)
        if morsel is None:
            return None
        value = morsel.value
        if not re.fullmatch(r"[A-Za-z0-9_-]{32,64}", value):
            return None
        return value

    def _read_command(self) -> str:
        content_type = self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower()
        if content_type != "application/json":
            raise ServiceError(HTTPStatus.UNSUPPORTED_MEDIA_TYPE, "json_required", "请求必须使用 application/json。")
        if self.headers.get("Transfer-Encoding"):
            raise ServiceError(HTTPStatus.BAD_REQUEST, "invalid_length", "请求长度无效。")
        raw_length = self.headers.get("Content-Length")
        if raw_length is None or not raw_length.isdecimal():
            raise ServiceError(HTTPStatus.BAD_REQUEST, "invalid_length", "请求缺少有效的 Content-Length。")
        length = int(raw_length)
        if length > MAX_BODY_BYTES:
            raise ServiceError(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, "body_too_large", "命令请求内容过大。")
        if length == 0:
            raise ServiceError(HTTPStatus.BAD_REQUEST, "empty_body", "请求内容不能为空。")
        try:
            body = self.rfile.read(length).decode("utf-8")
            payload = json.loads(body)
        except (UnicodeDecodeError, json.JSONDecodeError):
            raise ServiceError(HTTPStatus.BAD_REQUEST, "invalid_json", "请求必须是有效的 UTF-8 JSON。") from None
        if not isinstance(payload, dict) or set(payload) != {"command"} or not isinstance(payload["command"], str):
            raise ServiceError(HTTPStatus.BAD_REQUEST, "invalid_command", '请求格式必须是 {"command":"..."}。')
        command = payload["command"].strip()
        if not command or len(command) > MAX_COMMAND_CHARS or any(ord(ch) < 32 for ch in command):
            raise ServiceError(HTTPStatus.BAD_REQUEST, "invalid_command", "命令不能为空、过长或包含控制字符。")
        return command

    def _check_same_origin(self) -> None:
        host_header = self.headers.get("Host", "")
        try:
            host_info = urlsplit("//" + host_header)
            host = (host_info.hostname or "").casefold()
            host_port = host_info.port
        except ValueError:
            host, host_port = "", None
        if host not in self.server.allowed_hosts or host_port != self.server.server_port:
            raise ServiceError(HTTPStatus.FORBIDDEN, "origin_forbidden", "请求 Host 与本地服务地址不匹配。")

        supplied = self.headers.get("Origin")
        if supplied:
            parsed = urlsplit(supplied)
            valid = self._origin_matches(parsed, host)
        else:
            referer = self.headers.get("Referer")
            parsed = urlsplit(referer) if referer else None
            valid = parsed is not None and self._origin_matches(parsed, host)
        if not valid:
            raise ServiceError(HTTPStatus.FORBIDDEN, "origin_forbidden", "仅接受来自本地游戏页面的同源请求。")

    def _origin_matches(self, origin, request_host: str) -> bool:
        try:
            origin_port = origin.port
        except ValueError:
            return False
        if origin.scheme != "http" or origin.username or origin.password or origin.path not in ("", "/"):
            return False
        if origin.query or origin.fragment or (origin.hostname or "").casefold() != request_host:
            return False
        return origin_port == self.server.server_port

    def _set_cookie(self, session_id: str) -> str:
        return f"{COOKIE_NAME}={session_id}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800"

    def _service_error(self, exc: ServiceError) -> None:
        headers = {"Cache-Control": "no-store"}
        if exc.reset_cookie:
            headers["Set-Cookie"] = f"{COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0"
        self._json(exc.status, {"error": exc.message, "code": exc.code}, headers)

    def _json(self, status: int, value, extra_headers: dict[str, str] | None = None, *, head_only: bool = False) -> None:
        body = json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "same-origin")
        if extra_headers:
            for name, header_value in extra_headers.items():
                self.send_header(name, header_value)
        self.end_headers()
        if not head_only:
            self.wfile.write(body)

    def _static(self, relative_path: str, *, head_only: bool = False) -> None:
        path = WEB / relative_path
        if not path.is_file():
            self._json(HTTPStatus.NOT_FOUND, {"error": "页面资源尚未生成。", "code": "static_missing"}, head_only=head_only)
            return
        body = path.read_bytes()
        mime, _ = mimetypes.guess_type(path.name)
        if mime is None:
            mime = "application/octet-stream"
        if mime.startswith("text/") or mime in ("application/javascript", "application/json"):
            mime += "; charset=utf-8"
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "same-origin")
        self.end_headers()
        if not head_only:
            self.wfile.write(body)


def _loopback_hosts(bind_host: str) -> set[str]:
    try:
        addresses = {entry[4][0] for entry in socket.getaddrinfo(bind_host, None, type=socket.SOCK_STREAM)}
    except socket.gaierror as exc:
        raise SystemExit(f"无法解析绑定地址：{bind_host} ({exc})") from exc
    if not addresses or any(not __import__("ipaddress").ip_address(address.split("%", 1)[0]).is_loopback for address in addresses):
        raise SystemExit("此服务只允许绑定本机回环地址（127.0.0.1、::1 或 localhost）。")
    hosts = {bind_host.casefold()}
    for address in addresses:
        hosts.add(address.split("%", 1)[0].casefold())
    if any(address.startswith("127.") or address == "::1" for address in addresses):
        hosts.add("localhost")
    return hosts


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Start the local Slay the Spire 2 web command terminal.")
    parser.add_argument("--host", default="127.0.0.1", help="本机回环地址；不接受公开网卡地址（默认 127.0.0.1）")
    parser.add_argument("--port", type=int, default=8765, help="HTTP 端口（默认 8765）")
    parser.add_argument("--godot", type=Path, default=Path(os.environ.get("GODOT_BIN", DEFAULT_GODOT)), help="Godot Mono 4.5.1 可执行文件路径")
    parser.add_argument("--dotnet-root", help="DOTNET_ROOT 覆盖值；默认从 DOTNET_ROOT 或 PATH 中的 dotnet 推导")
    parser.add_argument("--max-sessions", type=int, default=4, help="同时运行的游戏主机数量上限（默认 4）")
    parser.add_argument("--idle-timeout", type=float, default=1800, help="空闲会话回收秒数（默认 1800）")
    parser.add_argument("--startup-timeout", type=float, default=90, help="引擎初始化超时秒数（默认 90）")
    parser.add_argument("--command-timeout", type=float, default=90, help="单条命令超时秒数（默认 90）")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    if not 0 <= args.port <= 65535 or args.max_sessions < 1 or args.idle_timeout < 1:
        raise SystemExit("--port、--max-sessions 或 --idle-timeout 参数无效。")
    if args.startup_timeout <= 0 or args.command_timeout <= 0:
        raise SystemExit("超时参数必须大于 0。")
    allowed_hosts = _loopback_hosts(args.host)
    try:
        dotnet_root = _resolve_dotnet_root(args.dotnet_root)
    except ServiceError as exc:
        raise SystemExit(exc.message) from exc
    manager = SessionManager(
        godot=args.godot.resolve(),
        dotnet_root=dotnet_root,
        max_sessions=args.max_sessions,
        idle_timeout=args.idle_timeout,
        startup_timeout=args.startup_timeout,
        command_timeout=args.command_timeout,
    )
    try:
        server = LocalServer((args.host, args.port), RequestHandler, manager, allowed_hosts=allowed_hosts)
    except OSError as exc:
        manager.close_all()
        raise SystemExit(f"无法启动本地网页服务：{exc}") from exc
    print(f"网页版已就绪：http://127.0.0.1:{server.server_port}/", flush=True)
    print("页面操作通过内置命令终端提交；按 Ctrl+C 关闭网页服务和游戏进程。", flush=True)
    try:
        server.serve_forever(poll_interval=0.25)
    except KeyboardInterrupt:
        pass
    finally:
        server.shutdown()
        server.server_close()
        manager.close_all()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
