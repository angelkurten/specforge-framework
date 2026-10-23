#!/usr/bin/env python3
"""Claude Code PreToolUse hook: refuse edits to tests a human approved.

Reads the hook payload on stdin. Exits 2 with the reason on stderr when an
Edit, Write, MultiEdit or NotebookEdit targets a locked test or a change's
locked-tests.txt, or when a Bash command writes to one, or removes or moves a
folder holding one; exits 0 otherwise. `scripts/lock_tests.py approve` and
`scripts/archive.py` are how a human changes the lock on purpose.

The Bash check matches common write forms only — redirection, in-place edits,
tee, rm, mv, cp, truncate and git checkout/restore. It is a guide, not a
guarantee: `scripts/lock_tests.py check`, which the loop runs after every
iteration, is what catches a write this hook misses.
"""

from __future__ import annotations

import json
import os
import re
import shlex
import sys
from pathlib import Path

FILE_TOOLS = {"Edit": "file_path", "Write": "file_path", "MultiEdit": "file_path", "NotebookEdit": "notebook_path"}

# A command word after which a locked path is being written, not read.
WRITERS = {"rm", "mv", "cp", "tee", "truncate", "dd"}
IN_PLACE = re.compile(r"\b(sed|perl|ruby)\b[^|;&]*\s-[a-zA-Z]*i")
GIT_WRITE = re.compile(r"\bgit\s+(checkout|restore|rm|mv)\b")


def load_locked(root: Path) -> set[Path]:
    """Locked tests plus the lock files themselves."""
    # The project's own copy first, then the framework copy beside this hook.
    sys.path[:0] = [str(root / "scripts"), str(Path(__file__).resolve().parents[2] / "scripts")]
    try:
        from lock_tests import lock_files, locked_paths
    except ImportError:
        return set()
    return locked_paths(root) | lock_files(root)


def protected(target: Path, locked: set[Path]) -> bool:
    """A protected file, or a folder holding one."""
    return target in locked or any(target in p.parents for p in locked)


def resolve(path: str, root: Path) -> Path:
    p = Path(path)
    return (p if p.is_absolute() else root / p).resolve()


def bash_writes(command: str, locked: set[Path], root: Path) -> Path | None:
    for segment in re.split(r"\|\||&&|[;|\n]", command):
        try:
            words = shlex.split(segment)
        except ValueError:
            words = segment.split()
        if not words:
            continue
        # Redirection targets: `> path`, `>> path`, `>path`.
        for match in re.finditer(r">>?\s*([^\s;&|]+)", segment):
            if resolve(match.group(1), root) in locked:
                return resolve(match.group(1), root)
        writer = (
            words[0] in WRITERS
            or IN_PLACE.search(segment)
            or GIT_WRITE.search(segment)
        )
        if writer:
            for word in words[1:]:
                if not word.startswith("-") and protected(resolve(word, root), locked):
                    return resolve(word, root)
    return None


def main() -> int:
    payload = json.load(sys.stdin)
    root = Path(os.environ.get("CLAUDE_PROJECT_DIR") or payload.get("cwd") or ".").resolve()
    locked = load_locked(root)
    if not locked:
        return 0
    tool = payload.get("tool_name", "")
    args = payload.get("tool_input") or {}
    hit = None
    if tool in FILE_TOOLS and args.get(FILE_TOOLS[tool]):
        target = resolve(args[FILE_TOOLS[tool]], root)
        hit = target if target in locked else None
    elif tool == "Bash" and args.get("command"):
        hit = bash_writes(args["command"], locked, root)
    if hit is None:
        return 0
    print(
        f"{hit.relative_to(root)} is locked: a human approved these tests red, and "
        "the implementation may not change them or their lock. If you think a test "
        "is wrong, stop and write a BLOCKED: line in progress.md instead.",
        file=sys.stderr,
    )
    return 2


if __name__ == "__main__":
    sys.exit(main())
