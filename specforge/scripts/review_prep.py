#!/usr/bin/env python3
"""Mechanical review of a change, and the packet the adversarial reviewer reads.

    python3 specforge/scripts/review_prep.py specforge/changes/<change> --base main

Diffs `<base>...HEAD` and reports what a pattern can decide on its own:

    blocker     a skip marker added, a test file deleted, a test function
                removed, a locked test changed, evidence.md missing or with an
                empty field
    should-fix  a stub added: TODO, FIXME, NotImplementedError, "not implemented"

A pattern written as data is not reported: prose files (.md, .txt, .rst,
.adoc), string literals, and lines inside a triple-quoted string added in the
same hunk. A test removed from a file that adds another test is reported as a
likely rename, at should-fix.

Everything that needs judgement — scope creep, acceptance evidence no test
covers, trivial tests, claims the evidence does not back — is left to the
reviewer agent, which reads the packet this script prints (specforge/core/review.md).

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
STUB = re.compile(r"\bTODO\b|\bFIXME\b|NotImplementedError")
# The one stub that lives inside a string: a throw or raise whose message says
# so. Matched on the raw line, since stripping strings would hide it.
THROWN_STUB = re.compile(r"\b(?:throw|raise)\b.*not\s+implemented", re.IGNORECASE)
PROSE = re.compile(r"\.(md|markdown|txt|rst|adoc)$")
STRING = re.compile(r"""[rRbBfFuU]*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)""")
TRIPLE = re.compile(r'"""|\'\'\'')
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


def code_lines(added: list[tuple[str, int, str]]) -> list[tuple[str, int, str, str]]:
    """Each added code line as (path, line, raw text, text with strings removed).

    Prose files are dropped, and so is every line inside a triple-quoted string
    that opens in the same hunk. The state resets wherever line numbers jump,
    because a new hunk may start anywhere.
    """
    out = []
    path_seen, last, inside = None, 0, None
    for path, number, text in added:
        if PROSE.search(path):
            continue
        if path != path_seen or number != last + 1:
            inside = None
        path_seen, last = path, number
        if inside:
            if inside in text:
                inside = None
            continue
        code = re.sub(r'""".*?"""|\'\'\'.*?\'\'\'', '""', text)
        opener = TRIPLE.search(code)
        if opener:
            inside = opener.group(0)
            code = code[: opener.start()]
        out.append((path, number, text, STRING.sub('""', code)))
    return out


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
    added = added_lines(rng)
    for path, number, text in added:
        if path.endswith("/locked-tests.txt") and text.startswith("# unlocked "):
            findings.append(f"should-fix: {path}:{number} — approved test re-opened by a human: {text[len('# unlocked '):]}")
    for path, number, text, code in code_lines(added):
        if SKIP.search(code):
            findings.append(f"blocker: {path}:{number} — skip marker added: {text.strip()}")
        if STUB.search(code) or THROWN_STUB.search(text):
            findings.append(f"should-fix: {path}:{number} — stub added: {text.strip()}")
    for status, path in files:
        if not TEST_FILE.search(path):
            continue
        if status == "D":
            findings.append(f"blocker: {path}:1 — test file deleted")
        elif status == "M":
            before = test_names(git("show", f"{base}:{path}"))
            after = test_names(Path(path).read_text())
            added = [name for name in after if name not in before]
            for name, line in before.items():
                if name in after:
                    continue
                if added:
                    findings.append(
                        f"should-fix: {path}:{line} — test {name} removed and "
                        f"{', '.join(added)} added: renamed?"
                    )
                else:
                    findings.append(f"blocker: {path}:{line} — test {name} removed")
    if not files:
        findings.append(f"blocker: {change / 'contract.md'}:1 — range {rng} is empty: nothing to review")
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
            "Read specforge/core/review.md, then the contract, the evidence report and the diff "
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
