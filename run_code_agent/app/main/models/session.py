# app/main/models/session.py
from __future__ import annotations
import asyncio
import contextlib
import time
from typing import Any, Optional

from ..config import WORKSPACE_ROOT
from ..utils.proc import stop_process

class Session:
    def __init__(self, session_id: str):
        self.id = session_id
        self.created_at = time.time()
        self.dev_proc: Optional[Any] = None  # asyncio.subprocess.Process or subprocess.Popen
        self.cwd = WORKSPACE_ROOT  # will switch to user folder on init
        self.email: Optional[str] = None
        self.last_dev_start_at: float = 0.0
        self.log_task: Optional[asyncio.Task] = None
        self.fs_task: Optional[asyncio.Task] = None
        # informational only (UI convenience)
        self.dev_port: Optional[int] = None
        self.dev_url: Optional[str] = None

class Sessions:
    def __init__(self):
        self._sessions: dict[str, Session] = {}
        self._lock = asyncio.Lock()

    async def create(self) -> Session:
        import uuid
        sid = uuid.uuid4().hex[:12]
        sess = Session(sid)
        async with self._lock:
            self._sessions[sid] = sess
        return sess

    async def get(self, sid: str) -> Optional[Session]:
        async with self._lock:
            return self._sessions.get(sid)

    async def remove(self, sid: str):
        async with self._lock:
            sess = self._sessions.pop(sid, None)
        if not sess:
            return
        # stop dev process
        if sess.dev_proc:
            await stop_process(sess.dev_proc)
        # stop tasks
        for task in (sess.log_task, sess.fs_task):
            if task and not task.done():
                task.cancel()
                with contextlib.suppress(Exception):
                    await task
