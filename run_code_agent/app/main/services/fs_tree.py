# app/main/services/fs_tree.py
from __future__ import annotations
from os import scandir
from pathlib import Path
from typing import Any
import stat as _stat

from ..utils.paths import safe_join

def walk_tree(base: Path, relative: str, max_depth: int, excludes: set[str]):
    root = safe_join(base, relative)
    items: list[dict[str, Any]] = []
    max_depth = max(0, min(10, max_depth))

    def _skip(name: str) -> bool:
        return name in excludes

    def _scan(dirpath: Path, depth: int, rel_root: str):
        try:
            with scandir(dirpath) as it:
                for entry in it:
                    name = entry.name
                    if _skip(name) or entry.is_symlink():
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
