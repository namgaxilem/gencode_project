"""
WebSocket per session, workspace per *email* under WORKSPACE_ROOT.

- WORKSPACE_ROOT layout:
  /tmp/workspaces/
    ├── alice@example.com/
    └── bob+qa@company.io/

- Client MUST send an initial WS message with user's email to bind session CWD:
  {"type":"init", "email":"alice@example.com"}

- After that, all ops (list_tree/read_file/write_file/start_dev/stop_dev) run inside
  WORKSPACE_ROOT/<email>/

Also exposes same-origin preview proxy to Next.js dev server.
"""
from __future__ import annotations

import asyncio
import contextlib
import json
import os
import shlex
import time
import uuid
from pathlib import Path
from typing import Any, Dict, Literal, Optional

import httpx
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from starlette.responses import Response
from websockets.client import connect as ws_connect

# ---------- Config ----------
WORKSPACE_ROOT = Path(os.getenv("WORKSPACE_ROOT", "/tmp/workspaces")).resolve()
WORKSPACE_ROOT.mkdir(parents=True, exist_ok=True)

NEXT_TARGET_HTTP = os.getenv("NEXT_TARGET", "http://127.0.0.1:3000").rstrip("/")
if NEXT_TARGET_HTTP.startswith("https://"):
    NEXT_TARGET_WS = "wss://" + NEXT_TARGET_HTTP[len("https://") :]
elif NEXT_TARGET_HTTP.startswith("http://"):
    NEXT_TARGET_WS = "ws://" + NEXT_TARGET_HTTP[len("http://") :]
else:
    NEXT_TARGET_WS = "ws://" + NEXT_TARGET_HTTP

DEV_CMD = os.getenv("DEV_CMD") or "npm run dev"  # default to npm run dev
DEV_CWD_ENV = os.getenv("DEV_CWD")  # if not provided, we use session.cwd

DEFAULT_EXCLUDES = {".git", "node_modules", ".next", "dist", "build", "__pycache__"}

app = FastAPI(title="WS Backend by Email Workspace", version="1.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Session State ----------
class Session:
    def __init__(self, session_id: str):
        self.id = session_id
        self.created_at = time.time()
        self.dev_proc: Optional[asyncio.subprocess.Process] = None
        self.cwd: Path = WORKSPACE_ROOT  # will switch to email folder on init
        self.email: Optional[str] = None

class Sessions:
    def __init__(self):
        self._sessions: dict[str, Session] = {}
        self._lock = asyncio.Lock()

    async def create(self) -> Session:
        sid = uuid.uuid4().hex[:12]
        sess = Session(sid)
        async with self._lock:
            self._sessions[sid] = sess
        return sess

    async def remove(self, sid: str):
        async with self._lock:
            sess = self._sessions.pop(sid, None)
        if sess and sess.dev_proc:
            await stop_process(sess.dev_proc)

SESSIONS = Sessions()

# ---------- Models (WS protocol) ----------
class WSBase(BaseModel):
    type: str
    req_id: Optional[str] = None

class InitReq(WSBase):
    type: Literal["init"]
    email: str

class ListTreeReq(WSBase):
    type: Literal["list_tree"]
    path: Optional[str] = ""
    max_depth: int = 2

class ReadFileReq(WSBase):
    type: Literal["read_file"]
    path: str

class WriteFileReq(WSBase):
    type: Literal["write_file"]
    path: str
    content: str
    create_if_missing: bool = True

class ChatReq(WSBase):
    type: Literal["chat"]
    message: str

class StartDevReq(WSBase):
    type: Literal["start_dev"]

class StopDevReq(WSBase):
    type: Literal["stop_dev"]

class SetCwdReq(WSBase):
    type: Literal["set_cwd"]
    cwd: str  # relative to WORKSPACE_ROOT

AllowedReq = InitReq | ListTreeReq | ReadFileReq | WriteFileReq | ChatReq | StartDevReq | StopDevReq | SetCwdReq

# ---------- Helpers ----------

def email_to_folder(email: str) -> str:
    # keep typical email chars, replace path separators and oddities
    e = (email or "").strip()
    e = e.replace("/", "_").replace("\\", "_")
    # guard against empty
    return e or "user"

def safe_join(root: Path, rel: str | None) -> Path:
    rel = rel or ""
    p = (root / rel).resolve()
    if not str(p).startswith(str(root)):
        raise HTTPException(status_code=400, detail="Path traversal detected")
    return p

async def stop_process(proc: asyncio.subprocess.Process):
    try:
        proc.terminate()
    except ProcessLookupError:
        return
    try:
        await asyncio.wait_for(proc.wait(), timeout=5)
    except asyncio.TimeoutError:
        with contextlib.suppress(ProcessLookupError):
            proc.kill()

async def start_dev_process(sess: Session) -> dict[str, Any]:
    # Prefer session.cwd; fallback to DEV_CWD from env
    cwd = Path(DEV_CWD_ENV) if DEV_CWD_ENV else sess.cwd
    if not cwd.exists():
        return {"ok": False, "message": f"cwd not found: {cwd}"}

    args = shlex.split(DEV_CMD)
    if sess.dev_proc and sess.dev_proc.returncode is None:
        return {"ok": True, "message": "dev already running", "cwd": str(cwd)}

    proc = await asyncio.create_subprocess_exec(
        *args,
        cwd=str(cwd),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
        env={**os.environ},  # add PORT here if you need to force a specific port
    )
    sess.dev_proc = proc

    # Read a few lines to confirm start
    started = False
    lines: list[str] = []
    start_ts = time.time()
    while time.time() - start_ts < 10:
        if proc.stdout is None:
            break
        try:
            line = await asyncio.wait_for(proc.stdout.readline(), timeout=0.5)
        except asyncio.TimeoutError:
            continue
        if not line:
            break
        s = line.decode(errors="ignore").rstrip()
        lines.append(s)
        if ("ready" in s.lower()) or ("started server" in s.lower()) or ("local:" in s.lower()):
            started = True
            break

    return {"ok": started, "message": "\n".join(lines[-20:]), "cwd": str(cwd)}

# Tree walking
from os import scandir
import stat as _stat

def walk_tree(base: Path, relative: str, max_depth: int, excludes: set[str]):
    root = safe_join(base, relative)
    items: list[dict[str, Any]] = []

    def _scan(dirpath: Path, depth: int, rel_root: str):
        try:
            with scandir(dirpath) as it:
                for entry in it:
                    name = entry.name
                    if name in excludes:
                        continue
                    try:
                        st = entry.stat(follow_symlinks=False)
                    except FileNotFoundError:
                        continue
                    rel_path = str(Path(rel_root) / name) if rel_root else name
                    if entry.is_dir(follow_symlinks=False):
                        items.append({"name": name, "path": rel_path, "type": "dir", "mtime": st.st_mtime})
                        if depth < max_depth:
                            _scan(Path(entry.path), depth + 1, rel_path)
                    else:
                        size = st.st_size if _stat.S_ISREG(st.st_mode) else None
                        items.append({"name": name, "path": rel_path, "type": "file", "size": size, "mtime": st.st_mtime})
        except PermissionError:
            pass

    _scan(root, 0, relative.strip("/"))
    return items

# ---------- WebSocket Endpoint ----------
@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()

    sess = await SESSIONS.create()
    await ws.send_json({"type": "session_init", "session_id": sess.id, "cwd": str(sess.cwd)})

    try:
        while True:
            msg = await ws.receive_text()
            try:
                data = json.loads(msg)
            except json.JSONDecodeError:
                await ws.send_json({"type": "error", "message": "invalid JSON"})
                continue

            if not isinstance(data, dict) or "type" not in data:
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
                    await ws.send_json({"type": "init_ok", "req_id": req_id, "email": req.email, "cwd": str(user_root)})

                elif t == "list_tree":
                    req = ListTreeReq(**data)
                    excludes = set(DEFAULT_EXCLUDES)
                    items = walk_tree(sess.cwd, req.path or "", max_depth=min(10, max(0, req.max_depth)), excludes=excludes)
                    await ws.send_json({"type": "list_tree_ok", "req_id": req_id, "items": items})

                elif t == "read_file":
                    req = ReadFileReq(**data)
                    f = safe_join(sess.cwd, req.path)
                    if not f.exists() or not f.is_file():
                        await ws.send_json({"type": "error", "req_id": req_id, "message": "file not found"})
                        continue
                    try:
                        content = f.read_text(encoding="utf-8")
                    except UnicodeDecodeError:
                        await ws.send_json({"type": "error", "req_id": req_id, "message": "not a utf-8 text file"})
                        continue
                    await ws.send_json({"type": "read_file_ok", "req_id": req_id, "path": req.path, "content": content})

                elif t == "write_file":
                    req = WriteFileReq(**data)
                    f = safe_join(sess.cwd, req.path)
                    if not f.exists():
                        if not req.create_if_missing:
                            await ws.send_json({"type": "error", "req_id": req_id, "message": "file does not exist"})
                            continue
                        f.parent.mkdir(parents=True, exist_ok=True)
                    f.write_text(req.content, encoding="utf-8")
                    await ws.send_json({"type": "write_file_ok", "req_id": req_id, "path": req.path})

                elif t == "chat":
                    req = ChatReq(**data)
                    reply = f"(demo) email={sess.email or '-'} | msg= " + req.message.strip()
                    await ws.send_json({"type": "chat_ok", "req_id": req_id, "message": reply})

                elif t == "start_dev":
                    req = StartDevReq(**data)
                    res = await start_dev_process(sess)
                    await ws.send_json({"type": "start_dev_ok", "req_id": req_id, **res, "preview_base": "/preview"})

                elif t == "stop_dev":
                    req = StopDevReq(**data)
                    if sess.dev_proc:
                        await stop_process(sess.dev_proc)
                        sess.dev_proc = None
                    await ws.send_json({"type": "stop_dev_ok", "req_id": req_id})

                elif t == "set_cwd":
                    req = SetCwdReq(**data)
                    new_cwd = safe_join(WORKSPACE_ROOT, req.cwd)
                    if not new_cwd.exists() or not new_cwd.is_dir():
                        await ws.send_json({"type": "error", "req_id": req_id, "message": "cwd not found"})
                        continue
                    sess.cwd = new_cwd
                    await ws.send_json({"type": "set_cwd_ok", "req_id": req_id, "cwd": str(new_cwd)})

                else:
                    await ws.send_json({"type": "error", "req_id": req_id, "message": f"unknown type: {t}"})

            except Exception as e:
                await ws.send_json({"type": "error", "req_id": req_id, "message": str(e)})

    except WebSocketDisconnect:
        pass
    finally:
        await SESSIONS.remove(sess.id)

# ---------- HTTP Reverse Proxy (same-origin preview) ----------
@app.api_route("/preview/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"])
async def preview_proxy(path: str, request: Request):
    target_url = f"{NEXT_TARGET_HTTP}/{path}"
    client = httpx.AsyncClient(follow_redirects=False)
    try:
        req_headers = dict(request.headers)
        for k in [
            "host","connection","keep-alive","proxy-authenticate","proxy-authorization","te","trailers","transfer-encoding","upgrade",
        ]:
            req_headers.pop(k, None)
        body = await request.body()
        resp = await client.request(
            request.method,
            target_url,
            params=request.query_params,
            headers=req_headers,
            content=body,
            timeout=60.0,
        )
        headers = [(k, v) for k, v in resp.headers.items() if k.lower() not in {"content-encoding","transfer-encoding","connection"}]
        return Response(content=resp.content, status_code=resp.status_code, headers=dict(headers))
    finally:
        await client.aclose()

# ---------- WebSocket Reverse Proxy (for HMR) ----------
@app.websocket("/preview-ws/{path:path}")
async def preview_ws_proxy(ws: WebSocket, path: str):
    await ws.accept()
    query = ws.scope.get("query_string", b"").decode()
    target = f"{NEXT_TARGET_WS}/{path}"
    if query:
        target += f"?{query}"

    try:
        async with ws_connect(target) as upstream:
            async def client_to_upstream():
                while True:
                    msg = await ws.receive()
                    if "text" in msg:
                        await upstream.send(msg["text"])  # type: ignore[arg-type]
                    elif "bytes" in msg:
                        await upstream.send(msg["bytes"])  # type: ignore[arg-type]
                    elif msg.get("type") == "websocket.disconnect":
                        break

            async def upstream_to_client():
                while True:
                    data = await upstream.recv()
                    if isinstance(data, (bytes, bytearray)):
                        await ws.send_bytes(data)
                    else:
                        await ws.send_text(str(data))

            await asyncio.gather(client_to_upstream(), upstream_to_client())
    except Exception as e:
        try:
            await ws.send_json({"type": "proxy_error", "message": str(e)})
        finally:
            await ws.close()

# ---------- Health ----------
@app.get("/healthz")
async def health():
    return {"ok": True, "workspace_root": str(WORKSPACE_ROOT), "next_target": NEXT_TARGET_HTTP}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
