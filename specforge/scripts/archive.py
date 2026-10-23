#!/usr/bin/env python3
"""Archive a finished change: move its folder to specforge/changes/archive/.

    python3 specforge/scripts/archive.py specforge/changes/<change>

Run by a human, or by the agent at a human's request, as the last commit
before the change merges. An archived change locks nothing, so the command
refuses while the change could still be hiding something: an evidence report
with an empty field, or a locked test that differs from what was approved.
It also refuses when the lock file differs from the last commit, since a
test re-hashed into the lock would otherwise pass. A refusal changes nothing
on disk. A tracked folder moves with `git mv`. Run it from the repository
root: paths in the lock file are relative to it.

Exit code 0 when archived, 1 when refused, 2 on usage error.
Python 3 standard library and git only.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lock_tests import LOCK_FILE, check  # noqa: E402
from review_prep import evidence_findings  # noqa: E402


def tracked(path: Path) -> bool:
    result = subprocess.run(["git", "ls-files", "--error-unmatch", str(path)], capture_output=True)
    return result.returncode == 0


def refusals(change: Path, target: Path) -> list[str]:
    if not change.is_dir():
        return [f"{change} is not a change folder"]
    if change.parent.name == "archive":
        return [f"{change} is already archived"]
    if target.exists():
        return [f"{target} already exists"]
    reasons = [f.split(" — ", 1)[1] for f in evidence_findings(change)]
    lock = change / LOCK_FILE
    if lock.is_file() and tracked(lock):
        if subprocess.run(["git", "diff", "--quiet", "HEAD", "--", str(lock)]).returncode != 0:
            reasons.append(f"{lock} differs from the last commit")
    reasons += [f"locked test changed: {path}" for path in check(change, Path.cwd())]
    return reasons


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print(__doc__.split("\n\n")[1], file=sys.stderr)
        return 2
    change = Path(argv[0])
    target = change.parent / "archive" / change.name
    reasons = refusals(change, target)
    if reasons:
        for reason in reasons:
            print(f"archive: refused — {reason}")
        return 1
    target.parent.mkdir(parents=True, exist_ok=True)
    if tracked(change):
        subprocess.run(["git", "mv", str(change), str(target)], check=True)
    else:
        shutil.move(str(change), str(target))
    print(f"archive: {change} → {target}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
