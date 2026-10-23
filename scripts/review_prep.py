#!/usr/bin/env python3
"""Mechanical review of a change, and the packet the adversarial reviewer reads.

    python3 scripts/review_prep.py changes/<change> --base main

Diffs `<base>...HEAD` and reports what a pattern can decide on its own:

    blocker     a skip marker added, a test file deleted, a test function
                removed, a locked test changed, evidence.md missing or with an
                empty field
    should-fix  a stub added: TODO, FIXME, NotImplementedError, "not implemented"

Everything that needs judgement — scope creep, acceptance evidence no test
covers, trivial tests, claims the evidence does not back — is left to the
reviewer agent, which reads the packet this script prints (core/review.md).

Exit code 0 when no blocker, 1 when any blocker, 2 on usage error. The packet
prints either way. Python 3 standard library and git only.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lock_tests import check as check_locked  # noqa: E402

TEST_FILE = re.compile(
    r"(^|/)tests?/|(^|/)test_[^/]*\.py$|_test\.(py|go)$|\.(test|spec)\.[jt]sx?$|Test\.java$"
)
SKIP = re.compile(
    r"@pytest\.mark\.skip|\bunittest\.skip\b|\.skip\(|\bxit\(|\bxdescribe\(|\bt\.Skip\(|@Disabled\b|@Ignore\b"
)
STUB = re.compile(r"\bTODO\b|\bFIXME\b|NotImplementedError|not implemented", re.IGNORECASE)
TEST_NAME = re.compile(
    r"^\s*def (test\w*)\(|^func (Test\w+)\(|\b(?:it|test)\(\s*['\"]([^'\"]+)['\"]",
    re.MULTILINE,
)
EVIDENCE_FIELDS = ("Ran", "Result", "Not checked", "Deviations from the contract")


def git(*args: str) -> str:
    return subprocess.run(["git", *args], capture_output=True, text=True, check=True).stdout


def changed_files(rng: str) -> list[tuple[str, str]]:
    out = git("diff", "--no-renames", "--name-status", rng)
    return [tuple(line.split("\t", 1)) for line in out.splitlines() if line]


def added_lines(rng: str) -> list[tuple[str, int, str]]:
    """Every added line as (path, new line number, text)."""
    out = git("diff", "--no-renames", "-U0", rng)
    path, line, added = None, 0, []
    for raw in out.splitlines():
        if raw.startswith("+++ "):
            path = raw[6:] if raw.startswith("+++ b/") else None
        elif raw.startswith("@@"):
            line = int(re.match(r"@@ -\S+ \+(\d+)", raw).group(1))
        elif raw.startswith("+") and path:
            added.append((path, line, raw[1:]))
            line += 1
    return added


def test_names(text: str) -> dict[str, int]:
    """Map each test name in a file to its line."""
    names = {}
    for match in TEST_NAME.finditer(text):
        name = next(g for g in match.groups() if g)
        names.setdefault(name, text.count("\n", 0, match.start()) + 1)
    return names


def evidence_findings(change: Path) -> list[str]:
    evidence = change / "evidence.md"
    if not evidence.is_file():
        return [f"blocker: {evidence}:1 — no evidence report"]
    text = re.sub(r"<!--.*?-->", "", evidence.read_text(), flags=re.DOTALL)
    findings = []
    for field in EVIDENCE_FIELDS:
        match = re.search(rf"^- \*\*{re.escape(field)}\*\*:(.*(?:\n(?!- \*\*).*)*)", text, re.MULTILINE)
        if not match or not match.group(1).strip():
            line = text.count("\n", 0, match.start()) + 1 if match else 1
            findings.append(f"blocker: {evidence}:{line} — evidence field '{field}' is empty")
    return findings


def review(change: Path, base: str) -> tuple[list[str], list[str]]:
    rng = f"{base}...HEAD"
    files = changed_files(rng)
    findings = []
    for path, number, text in added_lines(rng):
        if SKIP.search(text):
            findings.append(f"blocker: {path}:{number} — skip marker added: {text.strip()}")
        if STUB.search(text):
            findings.append(f"should-fix: {path}:{number} — stub added: {text.strip()}")
    for status, path in files:
        if not TEST_FILE.search(path):
            continue
        if status == "D":
            findings.append(f"blocker: {path}:1 — test file deleted")
        elif status == "M":
            before = test_names(git("show", f"{base}:{path}"))
            after = test_names(Path(path).read_text())
            for name, line in before.items():
                if name not in after:
                    findings.append(f"blocker: {path}:{line} — test {name} removed")
    for path in check_locked(change, Path.cwd()):
        findings.append(f"blocker: {path}:1 — locked test changed")
    findings += evidence_findings(change)
    return [f"{s} {p}" for s, p in files], findings


def packet(change: Path, base: str, files: list[str], findings: list[str]) -> str:
    return "\n".join(
        [
            "# Review packet",
            "",
            f"Contract: {change / 'contract.md'}",
            f"Evidence: {change / 'evidence.md'}",
            f"Range: {base}...HEAD",
            "",
            "## Changed files",
            "",
            *(f"- {f}" for f in files),
            "",
            "## Mechanical findings",
            "",
            *(findings or ["none"]),
            "",
            "## For the reviewer",
            "",
            "Read core/review.md, then the contract, the evidence report and the diff "
            f"(git diff {base}...HEAD). The findings above are settled; look for what a "
            "pattern cannot see.",
        ]
    )


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Mechanical review of a change.")
    parser.add_argument("change", type=Path, help="the change folder")
    parser.add_argument("--base", default="main", help="the ref the change branched from (default: main)")
    args = parser.parse_args(argv)
    files, findings = review(args.change, args.base)
    print(packet(args.change, args.base, files, findings))
    return 1 if any(f.startswith("blocker: ") for f in findings) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
