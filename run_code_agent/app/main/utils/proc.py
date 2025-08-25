# app/main/utils/proc.py
from __future__ import annotations
import asyncio
import contextlib
import os
import signal
import subprocess
from typing import Any, Optional

async def _run_quiet(*args: str) -> int:
    try:
        proc = await asyncio.create_subprocess_exec(
            *args, stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL
        )
        return await proc.wait()
    except Exception:
        return -1

async def _kill_port(port: int) -> None:
    """Best-effort: kill whoever holds `port` (last resort)."""
    if port is None:
        return
    if os.name == "nt":
        # netstat → PID → taskkill
        try:
            proc = await asyncio.create_subprocess_exec(
                "cmd", "/c", f'for /f "tokens=5" %a in (\'netstat -ano ^| findstr :{port}\') do @taskkill /PID %a /T /F',
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
            )
            await proc.wait()
        except Exception:
            pass
    else:
        # try lsof, then fuser
        rc = await _run_quiet("bash", "-lc", f"lsof -t -iTCP:{port} -sTCP:LISTEN | xargs -r kill -TERM")
        if rc != 0:
            await _run_quiet("bash", "-lc", f"fuser -k {port}/tcp")

async def stop_process(proc: Any, *, port: Optional[int] = None, timeout: float = 5.0) -> None:
    """
    Robustly stop either asyncio.subprocess.Process or subprocess.Popen.
    - POSIX: SIGTERM → wait → SIGKILL on the *process group*.
    - Windows: taskkill /T /F on the PID (kills the whole tree).
    - Optional: kill whoever still owns `port` as a fallback.
    """
    try:
        pid = getattr(proc, "pid", None)

        if os.name == "nt":
            # Kill the entire tree no matter what spawned it.
            if pid:
                with contextlib.suppress(Exception):
                    await asyncio.wait_for(
                        _run_quiet("taskkill", "/PID", str(pid), "/T", "/F"),
                        timeout=timeout
                    )
            # Also ask the object to exit, then wait briefly.
            with contextlib.suppress(Exception):
                if isinstance(proc, subprocess.Popen):
                    proc.terminate()
                else:
                    # asyncio Process has .terminate() on Unix only; on Windows it's no-op, so just wait
                    pass
            with contextlib.suppress(Exception):
                if isinstance(proc, asyncio.subprocess.Process):
                    await asyncio.wait_for(proc.wait(), timeout=2)
                else:
                    await asyncio.wait_for(asyncio.to_thread(proc.wait), timeout=2)

        else:
            # POSIX: kill the process group if we started with start_new_session=True
            if pid:
                with contextlib.suppress(Exception):
                    os.killpg(os.getpgid(pid), signal.SIGTERM)
            try:
                if isinstance(proc, asyncio.subprocess.Process):
                    await asyncio.wait_for(proc.wait(), timeout=timeout)
                else:
                    await asyncio.wait_for(asyncio.to_thread(proc.wait), timeout=timeout)
            except asyncio.TimeoutError:
                if pid:
                    with contextlib.suppress(Exception):
                        os.killpg(os.getpgid(pid), signal.SIGKILL)

        # Port fallback (best-effort) if something survived/detached.
        if port is not None:
            await _kill_port(port)

    except Exception:
        pass
    
# ---- log streaming readers ----
async def readline_exec(proc: asyncio.subprocess.Process, timeout=0.5) -> Optional[str]:
    if proc.stdout is None: return None
    try:
        line = await asyncio.wait_for(proc.stdout.readline(), timeout=timeout)
    except asyncio.TimeoutError:
        return None
    if not line: return None
    return line.decode(errors="ignore").rstrip("\n")

async def readline_popen(proc: subprocess.Popen, timeout=0.5) -> Optional[str]:
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
