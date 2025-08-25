# app/main/services/dev.py
from __future__ import annotations
import asyncio
import os
import shlex
import subprocess
import time
import traceback
from typing import Any

from fastapi import WebSocket
from ..config import DEV_CMD
from ..utils.paths import find_free_port
from ..utils.proc import _readline_exec, _readline_popen

async def start_dev_process(sess) -> dict[str, Any]:
    now = time.time()
    if now - sess.last_dev_start_at < 1.5:
        return {"ok": True, "message": "dev starting/running", "cwd": str(sess.cwd), "dev_port": sess.dev_port, "dev_url": sess.dev_url}
    sess.last_dev_start_at = now

    cwd = sess.cwd
    if not cwd.exists():
        return {"ok": False, "message": f"cwd not found: {cwd}"}

    if sess.dev_proc is not None and getattr(sess.dev_proc, "returncode", None) is None:
        return {"ok": True, "message": "dev already running", "cwd": str(cwd), "dev_port": sess.dev_port, "dev_url": sess.dev_url}

    port = sess.dev_port or find_free_port()
    sess.dev_port = port
    sess.dev_url = f"http://127.0.0.1:{port}"

    env = {
        **os.environ,
        "FORCE_COLOR": "1",
        "PORT": str(port),
        "VITE_PORT": str(port),
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
        return {"ok": False, "message": f"{e.__class__.__name__}: {e}\n{traceback.format_exc()}", "cwd": str(cwd)}

    return {"ok": True, "message": f"starting on port {port}", "cwd": str(cwd), "dev_port": port, "dev_url": sess.dev_url}

async def pump_dev_logs(sess, ws: WebSocket, send_lock: asyncio.Lock):
    try:
        proc = sess.dev_proc
        if not proc:
            return
        reader = _readline_popen if isinstance(proc, subprocess.Popen) else _readline_exec
        while True:
            line = await reader(proc, timeout=1.0)
            if line:
                async with send_lock:
                    await ws.send_json({"type": "dev_log", "line": line})
            rc = getattr(proc, "returncode", None)
            if rc is not None:
                break
    except asyncio.CancelledError:
        pass
    except Exception as e:
        async with send_lock:
            await ws.send_json({"type": "error", "message": f"dev_log_stream: {e}"})
