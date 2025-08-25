# app/main/utils/proc.py
from __future__ import annotations
import asyncio
import contextlib
import os
import signal
import subprocess
from typing import Any, Optional

async def stop_process(proc: Any):
    """Gracefully stop either asyncio subprocess or Popen on any OS."""
    try:
        if isinstance(proc, asyncio.subprocess.Process):
            with contextlib.suppress(Exception):
                os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
            try:
                await asyncio.wait_for(proc.wait(), timeout=5)
            except asyncio.TimeoutError:
                with contextlib.suppress(Exception):
                    os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
        else:
            # Popen path (Windows or POSIX)
            with contextlib.suppress(Exception):
                proc.terminate()
            try:
                await asyncio.wait_for(asyncio.to_thread(proc.wait), timeout=5)
            except asyncio.TimeoutError:
                with contextlib.suppress(Exception):
                    proc.kill()
    except Exception:
        pass

# ---- log streaming readers ----
async def _readline_exec(proc: asyncio.subprocess.Process, timeout=0.5) -> Optional[str]:
    if proc.stdout is None: return None
    try:
        line = await asyncio.wait_for(proc.stdout.readline(), timeout=timeout)
    except asyncio.TimeoutError:
        return None
    if not line: return None
    return line.decode(errors="ignore").rstrip("\n")

async def _readline_popen(proc: subprocess.Popen, timeout=0.5) -> Optional[str]:
    loop = asyncio.get_running_loop()
    if proc.stdout is None: return None
    try:
        line = await asyncio.wait_for(loop.run_in_executor(None, proc.stdout.readline), timeout=timeout)
    except asyncio.TimeoutError:
        return None
    if not line: return None
    if isinstance(line, bytes):
        return line.decode(errors="ignore").rstrip("\n")
    return str(line).rstrip("\n")
