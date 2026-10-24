#!/usr/bin/env python3
"""Approve red tests for a change, and check later that nobody changed them.

    python3 specforge/scripts/lock_tests.py approve specforge/changes/<change> tests/a_test.py ...
    python3 specforge/scripts/lock_tests.py check specforge/changes/<change>
    python3 specforge/scripts/lock_tests.py unlock specforge/changes/<change> --reason "<why>" tests/a_test.py ...

`approve` records one `<sha256>  <path>` line per test in
`<change>/locked-tests.txt`; approving a path again replaces its line. `check`
prints every approved test whose bytes no longer match and exits 1, or exits 0.
Paths are relative to the working directory, which is the repository root.

`unlock` is the one sanctioned way to change an approved test after a human
changes the design it encodes: it needs a reason, marks the entry UNLOCKED and
records `# unlocked <date> <path>: <reason>`. Until `approve` re-locks it,
`check` reports it, so the loop does not run and the change does not archive.
`approve` on an unlocked entry records `# reapproved <date> <path>`. History
lines are kept by every rewrite, so each re-approval shows in the diff.

This is the sensor half of the lock. The Claude Code hook in
`.claude/hooks/specforge_lock_guard.py` is the guide half: it refuses an edit
before it happens, but a determined edit can get around it. A hash cannot be
got around, so the loop runs `check` after every iteration.

Exit code 0 when clean, 1 when a locked test changed, 2 on usage error.
Python 3 standard library only.
"""

from __future__ import annotations

import hashlib
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

LOCK_FILE = "locked-tests.txt"
UNLOCKED = "UNLOCKED"
ENTRY = re.compile(r"^([0-9a-f]{64}|UNLOCKED)  (\S.*)$")


class MalformedLock(ValueError):
    """A lock line that is neither an entry, a # history line, nor blank."""


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_lock(change: Path) -> dict[str, str]:
    """Map each approved path to its approved hash, or UNLOCKED.

    Raises MalformedLock on any other line, so every reader fails closed."""
    entries = {}
    for number, line in enumerate(_lines(change), 1):
        if not line.strip() or line.startswith("#"):
            continue
        match = ENTRY.match(line)
        if not match:
            raise MalformedLock(f"{change / LOCK_FILE}:{number}: {line[:60]}")
        entries[match.group(2)] = match.group(1)
    return entries


def _lines(change: Path) -> list[str]:
    lock = change / LOCK_FILE
    return lock.read_text().splitlines() if lock.is_file() else []


def _write(change: Path, entries: dict[str, str], history: list[str]) -> None:
    lines = history + [f"{sha}  {path}" for path, sha in sorted(entries.items())]
    (change / LOCK_FILE).write_text("\n".join(lines) + "\n")


def _today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def approve(change: Path, paths: list[str], root: Path) -> None:
    entries = read_lock(change)
    history = [l for l in _lines(change) if l.startswith("#")]
    for path in paths:
        if entries.get(path) == UNLOCKED:
            history.append(f"# reapproved {_today()} {path}")
        entries[path] = digest(root / path)
    _write(change, entries, history)


def unlock(change: Path, paths: list[str], reason: str) -> list[str]:
    """Mark approved paths UNLOCKED; return the paths refused, changing nothing then."""
    entries = read_lock(change)
    refused = [p for p in paths if entries.get(p) in (None, UNLOCKED)]
    if refused:
        return refused
    history = [l for l in _lines(change) if l.startswith("#")]
    for path in paths:
        entries[path] = UNLOCKED
        history.append(f"# unlocked {_today()} {path}: {reason}")
    _write(change, entries, history)
    return []


def check(change: Path, root: Path) -> list[str]:
    """Return every approved path that is missing or no longer matches."""
    changed = []
    try:
        entries = read_lock(change)
    except MalformedLock as e:
        return [f"malformed lock line {e}"]
    for path, sha in entries.items():
        file = root / path
        if not file.is_file() or digest(file) != sha:
            changed.append(path)
    return changed


def active_changes(root: Path) -> list[Path]:
    """Change folders that lock tests: directly under specforge/changes/, not archived."""
    changes = root / "specforge" / "changes"
    if not changes.is_dir():
        return []
    return [c for c in changes.iterdir() if c.is_dir() and (c / LOCK_FILE).is_file()]


def locked_paths(root: Path) -> set[Path]:
    """Every test locked by an active change."""
    return {
        (root / path).resolve()
        for change in active_changes(root)
        for path, sha in read_lock(change).items()
        if sha != UNLOCKED
    }


def lock_files(root: Path) -> set[Path]:
    """The locked-tests.txt of every active change."""
    return {(change / LOCK_FILE).resolve() for change in active_changes(root)}


def main(argv: list[str]) -> int:
    if len(argv) >= 3 and argv[0] == "approve":
        approve(Path(argv[1]), argv[2:], Path.cwd())
        return 0
    if len(argv) >= 2 and argv[0] == "unlock":
        args, reason = list(argv[2:]), ""
        if "--reason" in args:
            i = args.index("--reason")
            reason = args[i + 1] if i + 1 < len(args) else ""
            del args[i : i + 2]
        if not reason.strip() or not args:
            print("unlock needs --reason \"<why the approved test must change>\" and at least one path", file=sys.stderr)
            return 2
        if "\n" in reason or "\r" in reason:
            print("unlock --reason must be one line: a newline would forge lock lines", file=sys.stderr)
            return 2
        refused = unlock(Path(argv[1]), args, reason.strip())
        for path in refused:
            print(f"not locked, nothing to unlock: {path}")
        return 1 if refused else 0
    if len(argv) == 2 and argv[0] == "check":
        change = Path(argv[1])
        if (change / LOCK_FILE).is_symlink():
            print(f"{change / LOCK_FILE} is a symlink: a lock must be a regular file")
            return 1
        changed = check(change, Path.cwd())
        try:
            unlocked = {p for p, sha in read_lock(change).items() if sha == UNLOCKED}
        except MalformedLock:
            unlocked = set()
        for path in changed:
            if path.startswith("malformed lock line"):
                print(path)
            elif path in unlocked:
                print(f"locked test unlocked, awaiting re-approval: {path}")
            else:
                print(f"locked test changed: {path}")
        return 1 if changed else 0
    print(__doc__.split("\n\n")[1], file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
