#!/usr/bin/env python3
"""Claude Code PreToolUse hook: refuse edits to tests a human approved.

Reads the hook payload on stdin. Exits 2 with the reason on stderr when an
Edit, Write, MultiEdit or NotebookEdit targets a locked test or a change's
locked-tests.txt, or when a Bash command writes to one, or removes or moves a
folder holding one; exits 0 otherwise. `specforge/scripts/lock_tests.py approve` and
`specforge/scripts/archive.py` are how a human changes the lock on purpose.

The Bash check matches common write forms only — redirection, in-place edits,
tee, rm, mv, cp, truncate and git checkout/restore. It is a guide, not a
guarantee: the loop compares every locked test against the hashes approved
before its first iteration, and that is what catches a write this hook misses.
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
WRITE_SHAPE = re.compile(r">|\b(rm|mv|cp|tee|truncate|dd)\b|\b(sed|perl|ruby)\b[^|;&]*\s-[a-zA-Z]*i|\bgit\s+(checkout|restore|rm|mv)\b")
UNLOCK = re.compile(r"lock_tests\.py\b[^;&|]*\bunlock\b")


def load_locked(root: Path) -> tuple[set[Path], set[Path]]:
    """Locked tests plus the lock files themselves, and the lock files alone."""
    # The project's own copy first, then the framework copy beside this hook.
    sys.path[:0] = [str(root / "specforge" / "scripts"), str(Path(__file__).resolve().parents[2] / "specforge" / "scripts")]
    try:
        from lock_tests import lock_files, locked_paths
    except ImportError:
        return set(), set()
    locks = lock_files(root)
    # A malformed lock raises here; main() fails closed on it.
    return locked_paths(root) | locks, locks


def removes_lock(target: Path, locks: set[Path]) -> bool:
    """Removing or moving away a lock file, or a folder that holds one."""
    return target in locks or any(target in lock.parents for lock in locks)


def resolve(path: str, root: Path) -> Path:
    p = Path(path)
    return (p if p.is_absolute() else root / p).resolve()


def bash_writes(command: str, locked: set[Path], locks: set[Path], root: Path) -> Path | None:
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
            # `git rm` and `git mv` act like rm and mv.
            verb, rest = (words[1], words[2:]) if words[0] == "git" and len(words) > 1 else (words[0], words[1:])
            args = [w for w in rest if not w.startswith("-")]
            # mv and cp write to their last argument and only read or move the
            # rest; every other writer writes to all of its arguments.
            moves = verb in {"mv", "cp"} and len(args) > 1
            for i, word in enumerate(args):
                target = resolve(word, root)
                destination = moves and i == len(args) - 1
                if target in locked:
                    return target
                if not destination and verb in {"rm", "mv"} and removes_lock(target, locks):
                    return target
    return None


def main() -> int:
    payload = json.load(sys.stdin)
    root = Path(os.environ.get("CLAUDE_PROJECT_DIR") or payload.get("cwd") or ".").resolve()
    tool = payload.get("tool_name", "")
    args = payload.get("tool_input") or {}
    try:
        locked, locks = load_locked(root)
    except Exception as e:  # fail closed: an unreadable lock protects everything
        if tool in FILE_TOOLS or (tool == "Bash" and WRITE_SHAPE.search(args.get("command") or "")):
            print(f"a lock file cannot be read ({e}); every write is refused until it is fixed", file=sys.stderr)
            return 2
        return 0
    if not locked:
        return 0
    hit = None
    if tool in FILE_TOOLS and args.get(FILE_TOOLS[tool]):
        target = resolve(args[FILE_TOOLS[tool]], root)
        hit = target if target in locked else None
    elif tool == "Bash" and args.get("command"):
        hit = bash_writes(args["command"], locked, locks, root)
    if hit is None:
        if tool == "Bash" and UNLOCK.search(args.get("command") or ""):
            # Unlocking an approved test is a human act: route it to a prompt.
            # Where nobody can answer (a `claude -p` loop iteration), the call is denied.
            print(json.dumps({"hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "ask",
                "permissionDecisionReason": "Unlocking approved tests needs a human: confirm only if you changed the design these tests encode.",
            }}))
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
