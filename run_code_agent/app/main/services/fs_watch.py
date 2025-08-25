# app/main/services/fs_watch.py
from __future__ import annotations
import asyncio
from pathlib import Path
from typing import Any

from fastapi import WebSocket
from ..config import WATCH_ENABLED, DEFAULT_EXCLUDES
from ..utils.paths import safe_join

# Optional dependency types
try:
    from watchfiles import awatch, Change  # type: ignore
except Exception:  # pragma: no cover
    awatch = None  # type: ignore
    Change = object  # type: ignore

def _change_name(ch) -> str:
    try:
        return {Change.added: "created", Change.modified: "modified", Change.deleted: "deleted"}[ch]
    except Exception:
        return "modified"

def _should_watch(*args) -> bool:
    if not args:
        return True
    path = args[-1]
    try:
        parts = set(Path(str(path)).parts)
    except Exception:
        return True
    return not bool(parts & (DEFAULT_EXCLUDES | {".DS_Store"}))

async def fs_watcher(sess, ws: WebSocket, send_lock: asyncio.Lock):
    if not WATCH_ENABLED or awatch is None:
        return
    try:
        async for changes in awatch(sess.cwd, watch_filter=_should_watch):
            events = []
            for ch, p in changes:
                pp = Path(p)
                try:
                    rel = str(pp.resolve().relative_to(sess.cwd))
                except Exception:
                    continue
                try:
                    st = pp.stat()
                    mtime = st.st_mtime
                    is_dir = pp.is_dir()
                except FileNotFoundError:
                    mtime = None
                    is_dir = False
                events.append({"event": _change_name(ch), "path": rel, "is_dir": is_dir, "mtime": mtime})
            if events:
                async with send_lock:
                    await ws.send_json({"type": "fs_batch", "events": events, "session_id": sess.id})
    except asyncio.CancelledError:
        pass
    except Exception as e:
        async with send_lock:
            await ws.send_json({"type": "fs_watch_error", "message": str(e)})
