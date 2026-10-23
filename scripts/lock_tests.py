#!/usr/bin/env python3
"""Approve red tests for a change, and check later that nobody changed them.

    python3 scripts/lock_tests.py approve changes/<change> tests/a_test.py ...
    python3 scripts/lock_tests.py check changes/<change>

`approve` records one `<sha256>  <path>` line per test in
`<change>/locked-tests.txt`; approving a path again replaces its line. `check`
prints every approved test whose bytes no longer match and exits 1, or exits 0.
Paths are relative to the working directory, which is the repository root.

This is the sensor half of the lock. The Claude Code hook in
`.claude/hooks/specforge_lock_guard.py` is the guide half: it refuses an edit
before it happens, but a determined edit can get around it. A hash cannot be
got around, so the loop runs `check` after every iteration.

Exit code 0 when clean, 1 when a locked test changed, 2 on usage error.
Python 3 standard library only.
"""

from __future__ import annotations

import hashlib
import sys
from pathlib import Path

LOCK_FILE = "locked-tests.txt"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_lock(change: Path) -> dict[str, str]:
    """Map each approved path to its approved hash."""
    lock = change / LOCK_FILE
    if not lock.is_file():
        return {}
    entries = {}
    for line in lock.read_text().splitlines():
        if line.strip():
            sha, path = line.split("  ", 1)
            entries[path] = sha
    return entries


def approve(change: Path, paths: list[str], root: Path) -> None:
    entries = read_lock(change)
    for path in paths:
        entries[path] = digest(root / path)
    lines = [f"{sha}  {path}" for path, sha in sorted(entries.items())]
    (change / LOCK_FILE).write_text("\n".join(lines) + "\n")


def check(change: Path, root: Path) -> list[str]:
    """Return every approved path that is missing or no longer matches."""
    changed = []
    for path, sha in read_lock(change).items():
        file = root / path
        if not file.is_file() or digest(file) != sha:
            changed.append(path)
    return changed


def locked_paths(root: Path) -> set[Path]:
    """Every test locked by an active change: one directly under changes/."""
    changes = root / "changes"
    if not changes.is_dir():
        return set()
    return {
        (root / path).resolve()
        for change in changes.iterdir()
        if change.is_dir()
        for path in read_lock(change)
    }


def main(argv: list[str]) -> int:
    if len(argv) >= 3 and argv[0] == "approve":
        approve(Path(argv[1]), argv[2:], Path.cwd())
        return 0
    if len(argv) == 2 and argv[0] == "check":
        changed = check(Path(argv[1]), Path.cwd())
        for path in changed:
            print(f"locked test changed: {path}")
        return 1 if changed else 0
    print(__doc__.split("\n\n")[1], file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
