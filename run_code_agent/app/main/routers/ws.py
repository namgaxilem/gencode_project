# app/main/routers/ws.py
from __future__ import annotations

import asyncio
import contextlib
import json
import time
import traceback
from pathlib import Path
from typing import Dict, Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException

from ..config import (
    DEFAULT_CLONE_URL,
    WORKSPACE_ROOT,
    DEFAULT_EXCLUDES,
    MAX_READ_BYTES,
    MAX_WRITE_BYTES,
)
from ..models.ws_protocol import (
    InitReq, ListTreeReq, ReadFileReq, WriteFileReq, ChatReq,
    StartDevReq, StopDevReq, SetCwdReq,
)
from ..services.sessions import SESSIONS
from ..services.dev import start_dev_process, pump_dev_logs
from ..services.fs_tree import walk_tree
from ..services.fs_watch import fs_watcher
from ..utils.paths import email_to_folder, safe_join, require_init
from ..utils.text import looks_text
from ..services.workspace import clear_directory, sync_repo_into
from ..utils.proc import stop_process

router = APIRouter()

# ---------- in-memory "active project per email" ----------
CURRENT_PROJECT_BY_EMAIL: dict[str, str] = {}
SETUP_LOCK_BY_EMAIL: dict[str, asyncio.Lock] = {}


def _dir_is_empty(p: Path) -> bool:
    try:
        next(p.iterdir())
        return False
    except StopIteration:
        return True


def _get_setup_lock(email_key: str) -> asyncio.Lock:
    lock = SETUP_LOCK_BY_EMAIL.get(email_key)
    if not lock:
        lock = asyncio.Lock()
        SETUP_LOCK_BY_EMAIL[email_key] = lock
    return lock


class LockedWS:
    """Tiny wrapper to serialize ws.send_json calls."""
    def __init__(self, ws: WebSocket, lock: asyncio.Lock):
        self.ws = ws
        self.lock = lock

    async def send_json(self, payload: Dict[str, Any]):
        async with self.lock:
            await self.ws.send_json(payload)


@router.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()

    send_lock = asyncio.Lock()
    lws = LockedWS(ws, send_lock)  # for passing into dev log pump & watchers

    async def send(payload: Dict[str, Any]):
        async with send_lock:
            await ws.send_json(payload)

    # background setup job (clear + clone) keyed by email
    async def setup_workspace(sess, user_root: Path, req_id: str | None, repo_url: str):
        async def setup_log(line: str):
            await send({"type": "setup_log", "line": line})

        email_key = sess.email or "unknown"
        lock = _get_setup_lock(email_key)
        async with lock:  # avoid two tabs racing for same email
            try:
                await setup_log("[setup] clearing workspace...")
                await clear_directory(user_root)

                await setup_log(f"[setup] cloning {repo_url} into workspace...")
                # workspace sync uses setup_log callback (no dev_log here)
                await sync_repo_into(user_root, repo_url, on_log=setup_log)

                # start watcher after files exist
                if not getattr(sess, "fs_task", None) or sess.fs_task.done():
                    sess.fs_task = asyncio.create_task(fs_watcher(sess, lws, send_lock))

                await send({"type": "setup_ok", "cwd": str(user_root)})
                await setup_log("[setup] done.")
            except asyncio.CancelledError:
                await setup_log("[setup] cancelled")
                raise
            except Exception as e:
                await send({"type": "error", "req_id": req_id, "message": f"setup_failed: {e}"})

    # create session
    sess = await SESSIONS.create()
    await send({"type": "session_init", "session_id": sess.id, "cwd": str(getattr(sess, "cwd", WORKSPACE_ROOT))})

    # keepalive pings (optional; safe to remove if your infra doesn't need it)
    async def _keepalive():
        try:
            while True:
                await asyncio.sleep(20)
                await send({"type": "ping", "ts": time.time()})
        except Exception:
            pass

    ping_task = asyncio.create_task(_keepalive(), name="_keepalive")

    try:
        while True:
            raw = await ws.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await send({"type": "error", "message": "invalid JSON"})
                continue
            if not isinstance(data, dict) or "type" not in data:
                await send({"type": "error", "message": "missing 'type'"})
                continue

            t = data.get("type")
            req_id = data.get("req_id")

            try:
                if t == "init":
                    # must include: email, project_id, optional setup ("auto"/"skip"/"force"), repo_url
                    req = InitReq(**data)
                    email_folder = email_to_folder(req.email)
                    user_root = safe_join(WORKSPACE_ROOT, email_folder)
                    user_root.mkdir(parents=True, exist_ok=True)

                    # bind session to this email workspace
                    sess.email = req.email
                    sess.project_id = req.project_id
                    sess.cwd = user_root

                    await send({
                        "type": "init_ok",
                        "req_id": req_id,
                        "email": req.email,
                        "project_id": req.project_id,
                        "cwd": str(user_root),
                    })

                    # Decide whether to (re)setup:
                    setup_mode = (getattr(req, "setup", None) or data.get("setup") or "auto").lower()
                    repo_url = getattr(req, "repo_url", None) or data.get("repo_url") or DEFAULT_CLONE_URL
                    remembered = CURRENT_PROJECT_BY_EMAIL.get(req.email)

                    should_setup = (
                        setup_mode == "force" or
                        (setup_mode == "auto" and (_dir_is_empty(user_root) or remembered not in (None, req.project_id)))
                    )

                    # remember current project_id (prevents wiping on reloads when unchanged)
                    CURRENT_PROJECT_BY_EMAIL[req.email] = req.project_id

                    if should_setup:
                        # Stop previous dev/log/watch before resetting
                        if getattr(sess, "dev_proc", None):
                            await stop_process(sess.dev_proc)
                            sess.dev_proc = None
                        if getattr(sess, "log_task", None) and not sess.log_task.done():
                            sess.log_task.cancel()
                            with contextlib.suppress(Exception):
                                await sess.log_task
                            sess.log_task = None
                        if getattr(sess, "fs_task", None) and not sess.fs_task.done():
                            sess.fs_task.cancel()
                            with contextlib.suppress(Exception):
                                await sess.fs_task
                            sess.fs_task = None

                        prev = getattr(sess, "setup_task", None)
                        if prev and not prev.done():
                            prev.cancel()
                            with contextlib.suppress(Exception):
                                await prev
                        sess.setup_task = asyncio.create_task(setup_workspace(sess, user_root, req_id, repo_url))
                    else:
                        # No reset needed; ensure watcher is running
                        if not getattr(sess, "fs_task", None) or sess.fs_task.done():
                            sess.fs_task = asyncio.create_task(fs_watcher(sess, lws, send_lock))

                elif t == "setup_workspace":
                    # explicit reset from client
                    require_init(sess)
                    repo_url = data.get("repo_url") or DEFAULT_CLONE_URL

                    if getattr(sess, "dev_proc", None):
                        await stop_process(sess.dev_proc)
                        sess.dev_proc = None
                    if getattr(sess, "log_task", None) and not sess.log_task.done():
                        sess.log_task.cancel()
                        with contextlib.suppress(Exception):
                            await sess.log_task
                        sess.log_task = None
                    if getattr(sess, "fs_task", None) and not sess.fs_task.done():
                        sess.fs_task.cancel()
                        with contextlib.suppress(Exception):
                            await sess.fs_task
                        sess.fs_task = None

                    prev = getattr(sess, "setup_task", None)
                    if prev and not prev.done():
                        prev.cancel()
                        with contextlib.suppress(Exception):
                            await prev
                    sess.setup_task = asyncio.create_task(setup_workspace(sess, sess.cwd, req_id, repo_url))
                    await send({"type": "setup_started", "req_id": req_id})

                elif t == "list_tree":
                    require_init(sess)
                    req = ListTreeReq(**data)
                    items = await asyncio.to_thread(
                        walk_tree,
                        sess.cwd,
                        req.path or "",
                        min(10, max(0, req.max_depth)),
                        set(DEFAULT_EXCLUDES),
                    )
                    await send({"type": "list_tree_ok", "req_id": req_id, "items": items})

                elif t == "read_file":
                    require_init(sess)
                    req = ReadFileReq(**data)
                    f = safe_join(sess.cwd, req.path)
                    if not f.exists() or not f.is_file():
                        await send({"type": "error", "req_id": req_id, "message": "file not found"})
                        continue
                    rawb = f.read_bytes()
                    if len(rawb) > MAX_READ_BYTES:
                        await send({"type": "error", "req_id": req_id, "message": "E_FILE_TOO_LARGE"})
                        continue
                    if not looks_text(rawb):
                        await send({"type": "error", "req_id": req_id, "message": "E_BINARY_NOT_ALLOWED"})
                        continue
                    await send({"type": "read_file_ok", "req_id": req_id, "path": req.path, "content": rawb.decode("utf-8", errors="strict")})

                elif t == "write_file":
                    require_init(sess)
                    req = WriteFileReq(**data)
                    f = safe_join(sess.cwd, req.path)
                    b = req.content.encode("utf-8")
                    if len(b) > MAX_WRITE_BYTES:
                        await send({"type": "error", "req_id": req_id, "message": "E_FILE_TOO_LARGE"})
                        continue
                    if not f.exists():
                        if not req.create_if_missing:
                            await send({"type": "error", "req_id": req_id, "message": "file does not exist"})
                            continue
                        f.parent.mkdir(parents=True, exist_ok=True)
                    f.write_bytes(b)
                    await send({"type": "write_file_ok", "req_id": req_id, "path": req.path})

                elif t == "chat":
                    req = ChatReq(**data)
                    await send({"type": "chat_ok", "req_id": req_id, "message": f"(demo) email={sess.email or '-'} | msg= {req.message.strip()}"})

                elif t == "start_dev":
                    require_init(sess)
                    _ = StartDevReq(**data)
                    res = await start_dev_process(sess)
                    await send({"type": "start_dev_ok", "req_id": req_id, **res})
                    if not getattr(sess, "log_task", None) or sess.log_task.done():
                        # dev logs only; pump writes dev_log/dev_url via lws
                        sess.log_task = asyncio.create_task(pump_dev_logs(sess, lws))

                elif t == "stop_dev":
                    require_init(sess)
                    _ = StopDevReq(**data)
                    if getattr(sess, "dev_proc", None):
                        await stop_process(sess.dev_proc)
                        sess.dev_proc = None
                    await send({"type": "stop_dev_ok", "req_id": req_id})

                elif t == "set_cwd":
                    req = SetCwdReq(**data)
                    new_cwd = safe_join(WORKSPACE_ROOT, req.cwd)
                    if not new_cwd.exists() or not new_cwd.is_dir():
                        await send({"type": "error", "req_id": req_id, "message": "cwd not found"})
                        continue
                    sess.cwd = new_cwd
                    await send({"type": "set_cwd_ok", "req_id": req_id, "cwd": str(new_cwd)})

                else:
                    await send({"type": "error", "req_id": req_id, "message": f"unknown type: {t}"})

            except HTTPException as he:
                await send({"type": "error", "req_id": req_id, "message": he.detail})
            except Exception as e:
                await send({
                    "type": "error",
                    "req_id": req_id,
                    "message": f"{e.__class__.__name__}: {e}",
                    "trace": traceback.format_exc(),
                })

    except WebSocketDisconnect:
        pass
    finally:
        with contextlib.suppress(Exception):
            ping_task.cancel(); await ping_task

        setup_t = getattr(sess, "setup_task", None)
        if setup_t and not setup_t.done():
            setup_t.cancel()
            with contextlib.suppress(Exception):
                await setup_t

        # stop dev proc on disconnect
        if getattr(sess, "dev_proc", None):
            with contextlib.suppress(Exception):
                await stop_process(sess.dev_proc)
            sess.dev_proc = None

        # cancel watcher/log tasks
        for attr in ("fs_task", "log_task"):
            t = getattr(sess, attr, None)
            if t and not t.done():
                t.cancel()
                with contextlib.suppress(Exception):
                    await t
                setattr(sess, attr, None)

        with contextlib.suppress(Exception):
            await SESSIONS.remove(sess.id)
