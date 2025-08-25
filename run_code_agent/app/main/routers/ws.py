# app/main/routers/ws.py
from __future__ import annotations

import asyncio
import contextlib
import json
import time
import traceback
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException

from ..config import WORKSPACE_ROOT, DEFAULT_EXCLUDES, MAX_READ_BYTES, MAX_WRITE_BYTES
from ..models.ws_protocol import (
    InitReq, ListTreeReq, ReadFileReq, WriteFileReq, ChatReq,
    StartDevReq, StopDevReq, SetCwdReq,
)
from ..models.session import Session
from ..services.sessions import SESSIONS
from ..services.dev import start_dev_process, pump_dev_logs
from ..services.fs_tree import walk_tree
from ..services.fs_watch import fs_watcher
from ..utils.paths import email_to_folder, safe_join, require_init
from ..utils.text import looks_text

router = APIRouter()

@router.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()

    send_lock = asyncio.Lock()
    sess = await SESSIONS.create()
    async with send_lock:
        await ws.send_json({"type": "session_init", "session_id": sess.id, "cwd": str(sess.cwd)})

    # keepalive pings
    async def _keepalive():
        try:
            while True:
                await asyncio.sleep(20)
                async with send_lock:
                    await ws.send_json({"type": "ping", "ts": time.time()})
        except Exception:
            pass

    ping_task = asyncio.create_task(_keepalive())

    try:
        while True:
            msg = await ws.receive_text()
            try:
                data = json.loads(msg)
            except json.JSONDecodeError:
                async with send_lock:
                    await ws.send_json({"type": "error", "message": "invalid JSON"})
                continue

            if not isinstance(data, dict) or "type" not in data:
                async with send_lock:
                    await ws.send_json({"type": "error", "message": "missing 'type'"})
                continue

            t = data.get("type")
            req_id = data.get("req_id")

            try:
                if t == "init":
                    req = InitReq(**data)
                    email_folder = email_to_folder(req.email)
                    user_root = safe_join(WORKSPACE_ROOT, email_folder)
                    user_root.mkdir(parents=True, exist_ok=True)
                    sess.email = req.email
                    sess.cwd = user_root
                    async with send_lock:
                        await ws.send_json({"type": "init_ok", "req_id": req_id, "email": req.email, "cwd": str(user_root)})

                    if (not sess.fs_task) or sess.fs_task.done():
                        sess.fs_task = asyncio.create_task(fs_watcher(sess, ws, send_lock))

                elif t == "list_tree":
                    require_init(sess)
                    req = ListTreeReq(**data)
                    excludes = set(DEFAULT_EXCLUDES)
                    items = walk_tree(sess.cwd, req.path or "", max_depth=min(10, max(0, req.max_depth)), excludes=excludes)
                    async with send_lock:
                        await ws.send_json({"type": "list_tree_ok", "req_id": req_id, "items": items})

                elif t == "read_file":
                    require_init(sess)
                    req = ReadFileReq(**data)
                    f = safe_join(sess.cwd, req.path)
                    if not f.exists() or not f.is_file():
                        async with send_lock:
                            await ws.send_json({"type": "error", "req_id": req_id, "message": "file not found"})
                        continue
                    raw = f.read_bytes()
                    if len(raw) > MAX_READ_BYTES:
                        async with send_lock:
                            await ws.send_json({"type": "error", "req_id": req_id, "message": "E_FILE_TOO_LARGE"})
                        continue
                    if not looks_text(raw):
                        async with send_lock:
                            await ws.send_json({"type": "error", "req_id": req_id, "message": "E_BINARY_NOT_ALLOWED"})
                        continue
                    content = raw.decode("utf-8", errors="strict")
                    async with send_lock:
                        await ws.send_json({"type": "read_file_ok", "req_id": req_id, "path": req.path, "content": content})

                elif t == "write_file":
                    require_init(sess)
                    req = WriteFileReq(**data)
                    f = safe_join(sess.cwd, req.path)
                    b = req.content.encode("utf-8")
                    if len(b) > MAX_WRITE_BYTES:
                        async with send_lock:
                            await ws.send_json({"type": "error", "req_id": req_id, "message": "E_WRITE_TOO_LARGE"})
                        continue
                    if not f.exists():
                        if not req.create_if_missing:
                            async with send_lock:
                                await ws.send_json({"type": "error", "req_id": req_id, "message": "file does not exist"})
                            continue
                        f.parent.mkdir(parents=True, exist_ok=True)
                    f.write_bytes(b)
                    async with send_lock:
                        await ws.send_json({"type": "write_file_ok", "req_id": req_id, "path": req.path})

                elif t == "chat":
                    req = ChatReq(**data)
                    reply = f"(demo) email={sess.email or '-'} | msg= " + req.message.strip()
                    async with send_lock:
                        await ws.send_json({"type": "chat_ok", "req_id": req_id, "message": reply})

                elif t == "start_dev":
                    require_init(sess)
                    _ = StartDevReq(**data)
                    res = await start_dev_process(sess)
                    async with send_lock:
                        await ws.send_json({"type": "start_dev_ok", "req_id": req_id, **res})
                    if not sess.log_task or sess.log_task.done():
                        sess.log_task = asyncio.create_task(pump_dev_logs(sess, ws, send_lock))

                elif t == "stop_dev":
                    from ..utils.proc import stop_process
                    require_init(sess)
                    _ = StopDevReq(**data)
                    if sess.dev_proc:
                        await stop_process(sess.dev_proc)
                        sess.dev_proc = None
                    async with send_lock:
                        await ws.send_json({"type": "stop_dev_ok", "req_id": req_id})

                elif t == "set_cwd":
                    req = SetCwdReq(**data)
                    new_cwd = safe_join(WORKSPACE_ROOT, req.cwd)
                    if not new_cwd.exists() or not new_cwd.is_dir():
                        async with send_lock:
                            await ws.send_json({"type": "error", "req_id": req_id, "message": "cwd not found"})
                        continue
                    sess.cwd = new_cwd
                    async with send_lock:
                        await ws.send_json({"type": "set_cwd_ok", "req_id": req_id, "cwd": str(new_cwd)})

                else:
                    async with send_lock:
                        await ws.send_json({"type": "error", "req_id": req_id, "message": f"unknown type: {t}"})

            except HTTPException as he:
                async with send_lock:
                    await ws.send_json({"type": "error", "req_id": req_id, "message": he.detail})
            except Exception as e:
                async with send_lock:
                    await ws.send_json({"type": "error", "req_id": req_id, "message": f"{e.__class__.__name__}: {e}", "trace": traceback.format_exc()})

    except WebSocketDisconnect:
        pass
    finally:
        ping_task.cancel()
        with contextlib.suppress(Exception):
            await SESSIONS.remove(sess.id)
