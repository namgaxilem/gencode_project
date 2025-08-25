# app/main/services/workspace.py
from __future__ import annotations
import asyncio
import os
import shutil
from contextlib import suppress
from pathlib import Path
from typing import Awaitable, Callable, Optional

from ..utils.proc import readline_exec


async def clear_directory(root: Path) -> None:
    """
    Delete ALL items inside 'root'.
    Runs in a thread so it won't block the event loop.
    """
    def _sync():
        root.mkdir(parents=True, exist_ok=True)
        for p in list(root.iterdir()):
            if p.is_dir():
                shutil.rmtree(p, ignore_errors=True)
            else:
                with suppress(Exception):
                    p.unlink()
    await asyncio.to_thread(_sync)


async def sync_repo_into(
    root: Path,
    repo_url: str,
    on_log: Optional[Callable[[str], Awaitable[None]]] = None,
) -> None:
    """
    Clone 'repo_url' directly into 'root' (not nested).
    Assumes 'root' is empty (call clear_directory() first).
    Streams basic text lines via `on_log` (e.g., to send 'setup_log' events).
    """
    root.mkdir(parents=True, exist_ok=True)

    # Ensure it's empty
    if any(root.iterdir()):
        raise RuntimeError("Workspace not empty; call clear_directory() first")

    env = {
        **os.environ,
        "GIT_TERMINAL_PROMPT": "0",  # don't prompt for credentials
        "GIT_ASKPASS": "echo",
    }

    if on_log:
        await on_log(f"[setup] git clone {repo_url} → {root} ...")

    proc = await asyncio.create_subprocess_exec(
        "git", "clone",
        "--depth=1", "--single-branch", "--no-tags", "--progress",
        repo_url, ".",
        cwd=str(root),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
        env=env,
        start_new_session=True,
    )

    # Stream clone output (best effort)
    while True:
        line = await readline_exec(proc, timeout=1.0)
        if line is not None and on_log:
            await on_log(f"[setup] {line}")
        if proc.returncode is not None:
            break

    rc = await proc.wait()
    if rc != 0:
        raise RuntimeError(f"git clone failed with exit code {rc}")

    if on_log:
        await on_log("[setup] clone completed")
