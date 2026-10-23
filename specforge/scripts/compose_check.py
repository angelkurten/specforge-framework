#!/usr/bin/env python3
"""Check a change's compose.md: every lesson on one rung, with a real artifact.

    python3 specforge/scripts/compose_check.py specforge/changes/<change>

compose.md is one table, | Lesson | Rung | Artifact | Why not lower |, one row
per lesson the change taught (specforge/core/compose.md). Refused, by row:

    a rung other than 1 test, 2 rule, 3 example, 4 instruction, 5 doc
    an artifact that is not a file inside the repository
    a rung above 1 with no reason the lower rungs are not enough
    a rung-1 artifact that is not a test file
    a rung-4 AGENTS.md or CLAUDE.md over 80 lines

Whether the rung is the right one is the human's call; this only checks that
the record is complete and points at something real. Run from the repository
root. Exit code 0 when valid, 1 when refused, 2 on usage error.
Python 3 standard library only.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from review_prep import TEST_FILE  # noqa: E402

RUNGS = {"1 test", "2 rule", "3 example", "4 instruction", "5 doc"}
INSTRUCTION_FILES = {"AGENTS.md", "CLAUDE.md"}
INSTRUCTION_CAP = 80
NO_REASON = {"", "—", "-", "–"}


def rows(text: str) -> list[list[str]]:
    """The table's body rows, as stripped cells."""
    table = [l for l in text.splitlines() if l.strip().startswith("|")]
    return [[c.strip() for c in l.strip().strip("|").split("|")] for l in table[2:]]


def problems(change: Path, root: Path) -> list[str]:
    record = change / "compose.md"
    if not record.is_file():
        return [f"{record} is missing"]
    body = rows(record.read_text())
    if not body:
        return [f"{record} has no lesson rows"]
    found = []
    for cells in body:
        lesson, rung, artifact, why = (cells + [""] * 4)[:4]
        artifact = artifact.strip("`")
        if rung not in RUNGS:
            found.append(f"{lesson}: rung {rung!r} is not one of {', '.join(sorted(RUNGS))}")
            continue
        path = (root / artifact).resolve()
        if not artifact or not path.exists():
            found.append(f"{lesson}: artifact {artifact or '(none)'} does not exist")
            continue
        if root.resolve() not in path.parents:
            found.append(f"{lesson}: artifact {artifact} is outside the repository")
            continue
        if not path.is_file():
            found.append(f"{lesson}: artifact {artifact} is not a file")
            continue
        if rung != "1 test" and why in NO_REASON:
            found.append(f"{lesson}: rung {rung} needs a reason why lower rungs are not enough")
        if rung == "1 test" and not TEST_FILE.search(artifact):
            found.append(f"{lesson}: rung 1 artifact {artifact} is not a test file")
        if rung == "4 instruction" and path.name in INSTRUCTION_FILES:
            lines = len(path.read_text().splitlines())
            if lines > INSTRUCTION_CAP:
                found.append(f"{lesson}: {artifact} is {lines} lines, over the {INSTRUCTION_CAP}-line cap")
    return found


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print(__doc__.split("\n\n")[1], file=sys.stderr)
        return 2
    found = problems(Path(argv[0]), Path.cwd())
    for problem in found:
        print(f"compose: {problem}")
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
