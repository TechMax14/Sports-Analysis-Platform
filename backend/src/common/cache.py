# backend/src/common/cache.py
from __future__ import annotations

import os
import time
import tempfile
from contextlib import contextmanager
from pathlib import Path
from typing import Callable, Optional

# ---------- freshness ----------
def is_fresh(path: Path, ttl_seconds: int) -> bool:
    if not path.exists():
        return False
    age = time.time() - path.stat().st_mtime
    return age <= ttl_seconds

def touch(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.touch()

# ---------- simple unix lock (works great in Docker/Linux) ----------
@contextmanager
def file_lock(lock_path: Path):
    """
    Very small lock to prevent concurrent runs clobbering the same outputs.
    Uses exclusive create; if lock exists we wait.
    """
    lock_path.parent.mkdir(parents=True, exist_ok=True)

    while True:
        try:
            fd = os.open(str(lock_path), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            os.write(fd, str(os.getpid()).encode("utf-8"))
            os.close(fd)
            break
        except FileExistsError:
            time.sleep(0.25)

    try:
        yield
    finally:
        try:
            lock_path.unlink(missing_ok=True)
        except Exception:
            # if something weird happens, don't crash teardown
            pass

# ---------- atomic file write helpers ----------
def atomic_write_bytes(data: bytes, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(delete=False, dir=str(path.parent), suffix=".tmp") as tmp:
        tmp.write(data)
        tmp.flush()
        os.fsync(tmp.fileno())
        tmp_name = tmp.name
    os.replace(tmp_name, path)

def atomic_write_text(text: str, path: Path, encoding: str = "utf-8") -> None:
    atomic_write_bytes(text.encode(encoding), path)

# ---------- ensure_fresh orchestration ----------
def ensure_fresh(
    marker_path: Path,
    ttl_seconds: int,
    build_fn: Callable[[], None],
    force: bool = False,
    lock_path: Optional[Path] = None,
) -> bool:
    """
    Returns True if we rebuilt, False if we skipped.
    marker_path is a small "done" file representing the artifact/group.
    """
    if not force and is_fresh(marker_path, ttl_seconds):
        return False

    if lock_path is None:
        lock_path = marker_path.with_suffix(marker_path.suffix + ".lock")

    with file_lock(lock_path):
        # Re-check after acquiring lock (another process may have built)
        if not force and is_fresh(marker_path, ttl_seconds):
            return False

        build_fn()
        touch(marker_path)
        return True
