# app/main/services/dev.py
from __future__ import annotations
import asyncio
import os
import re
import shlex
import subprocess
import time
import traceback
from typing import Any

from fastapi import WebSocket
from ..config import DEV_CMD
from ..utils.paths import find_free_port
from ..utils.proc import readline_exec, readline_popen

# -- Detect URLs printed by dev servers (Vite/Next/CRA etc.)
ANSI_RE = re.compile(r"\x1B\[[0-?]*[ -/]*[@-~]")  # strip ANSI escapes
URL_RE = re.compile(
    r"(https?://(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::\d+)?(?:/\S*)?)",
    re.IGNORECASE,
)

async def start_dev_process(sess) -> dict[str, Any]:
    now = time.time()
    if now - sess.last_dev_start_at < 1.5:
        return {
            "ok": True,
            "message": "dev starting/running",
            "cwd": str(sess.cwd),
            "dev_port": sess.dev_port,
            "dev_url": sess.dev_url,
        }
    sess.last_dev_start_at = now

    cwd = sess.cwd
    if not cwd.exists():
        return {"ok": False, "message": f"cwd not found: {cwd}"}

    # If a process is already running, just report it
    if sess.dev_proc is not None and getattr(sess.dev_proc, "returncode", None) is None:
        return {
            "ok": True,
            "message": "dev already running",
            "cwd": str(cwd),
            "dev_port": sess.dev_port,
            "dev_url": sess.dev_url,
        }

    # Pick a port (helps multi-user isolation), but DON'T claim this as dev_url yet.
    port = sess.dev_port or find_free_port()
    sess.dev_port = port
    sess.dev_url = None  # let log detection set the real URL

    env = {
        **os.environ,
        "FORCE_COLOR": "1",
        "PORT": str(port),       # used by many CLIs (Next/CRA)
        "VITE_PORT": str(port),  # some CLIs read this
        "BROWSER": "none",
        "NPM_CONFIG_PROGRESS": "false", "npm_config_progress": "false",
        "NPM_CONFIG_FUND": "false",     "npm_config_fund": "false",
    }

    cmd_str = DEV_CMD

    try:
        if os.name == "nt":
            proc = subprocess.Popen(
                cmd_str,
                cwd=str(cwd),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                shell=True,
                env=env,
                text=True, encoding="utf-8", errors="ignore",
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
            )
            sess.dev_proc = proc
        else:
            if "&&" in cmd_str or "|" in cmd_str:
                proc = await asyncio.create_subprocess_shell(
                    cmd_str,
                    cwd=str(cwd),
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.STDOUT,
                    env=env,
                    start_new_session=True,
                )
            else:
                proc = await asyncio.create_subprocess_exec(
                    *shlex.split(cmd_str),
                    cwd=str(cwd),
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.STDOUT,
                    env=env,
                    start_new_session=True,
                )
            sess.dev_proc = proc
    except Exception as e:
        return {
            "ok": False,
            "message": f"{e.__class__.__name__}: {e}\n{traceback.format_exc()}",
            "cwd": str(cwd),
        }

    return {
        "ok": True,
        "message": f"starting (requested port {port})",
        "cwd": str(cwd),
        "dev_port": port,
        "dev_url": sess.dev_url,  # None for now; will be sent via 'dev_url' event when detected
    }

async def pump_dev_logs(sess, ws: WebSocket, send_lock: asyncio.Lock):
    """
    Stream dev logs. While streaming, auto-detect and broadcast the dev server URL once:
      -> send { "type": "dev_url", "url": "http://localhost:5174/" }
    Works even if the dev server switches ports (Vite: "Port 5173 is in use, trying another one...").
    """
    try:
        proc = sess.dev_proc
        if not proc:
            return
        reader = readline_popen if isinstance(proc, subprocess.Popen) else readline_exec

        while True:
            line = await reader(proc, timeout=1.0)
            if line:
                # 1) Strip ANSI, then try to find a URL
                plain = ANSI_RE.sub("", line)
                if not sess.dev_url:
                    m = URL_RE.search(plain)
                    if m:
                        # Use exactly what the dev server prints (e.g., http://localhost:5174/)
                        sess.dev_url = m.group(1)
                        async with send_lock:
                            await ws.send_json({"type": "dev_url", "url": sess.dev_url})

                # Forward the log line
                async with send_lock:
                    await ws.send_json({"type": "dev_log", "line": line})

            # Process ended?
            rc = getattr(proc, "returncode", None)
            if rc is not None:
                break

    except asyncio.CancelledError:
        pass
    except Exception as e:
        async with send_lock:
            await ws.send_json({"type": "error", "message": f"dev_log_stream: {e}"})
