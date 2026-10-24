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
EVIDENCE_FIELDS = ("Ran", "Result", "CI", "Not checked", "Deviations from the contract")
# A CI value must name a run: `run 17`, `run #17`, an /actions/runs/<id> URL,
# or a commit hash with a digit. A placeholder, wrapped or not, or a workflow
# name alone (`v2-ci`: pending) names none.
NAMES_A_RUN = re.compile(r"\brun\s*#?\d+\b|/actions/runs/\d+|\b(?=[0-9a-f]*\d)[0-9a-f]{7,40}\b", re.IGNORECASE)


def git(*args: str) -> str:
    # quotePath=false: a non-ASCII path is printed as itself, not "d\\303\\251mo",
    # so every path test below sees the real name.
    return subprocess.run(["git", "-c", "core.quotePath=false", *args], capture_output=True, text=True, check=True).stdout


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


def lock_findings(base: str, files: list[tuple[str, str]], added: list[tuple[str, int, str]]) -> list[str]:
    """Every change to an approved test's lock in the range, unattributed: the diff cannot say who.

    Compares every lock at the base with every lock at HEAD, both read from git
    and paired by canonical path, where `changes/archive/<name>/` counts as
    `changes/<name>/`. A dirty working tree cannot hide a committed change, an
    archive move cannot unpair a lock, and a second lock for the same change is
    itself reported. History lines are compared by count. A human confirms each
    finding (specforge/core/review.md)."""
    before, after = _locks_at(base), _locks_at("HEAD")
    out = _mode_findings(_lock_modes(base), _lock_modes("HEAD"))
    for key, copies in after.items():
        if len(copies) > 1:
            paths = ", ".join(p for p, _ in copies)
            out.append(f"should-fix: {copies[0][0]}:1 — more than one lock for this change, confirm it: {paths}")
    for key, copies in before.items():
        for path, text in copies:
            old_entries, old_history = _parse_lock(text)
            if key not in after:
                for entry, (_, number) in old_entries.items():
                    out.append(f"should-fix: {path}:{number} — lock removed in the range, confirm it: {entry}")
                continue
            for new_path, new_text in after[key]:
                new_entries, new_history = _parse_lock(new_text)
                for entry, (sha, number) in old_entries.items():
                    if entry not in new_entries:
                        out.append(f"should-fix: {path}:{number} — approved entry removed, confirm it: {entry}")
                    elif new_entries[entry][0] not in (sha, "UNLOCKED"):
                        out.append(f"should-fix: {new_path}:{new_entries[entry][1]} — approved hash changed (re-approved), confirm it: {entry}")
                for line, numbers in old_history.items():
                    for number in numbers[len(new_history.get(line, [])):]:
                        out.append(f"should-fix: {path}:{number} — lock history removed, confirm it: {line}")
                for line, numbers in new_history.items():
                    for number in numbers[len(old_history.get(line, [])):]:
                        out.append(f"should-fix: {new_path}:{number} — lock history added, confirm it: {line}")
    for key, copies in after.items():
        if key not in before:
            for path, text in copies:
                for line, numbers in _parse_lock(text)[1].items():
                    for number in numbers:
                        out.append(f"should-fix: {path}:{number} — lock history added, confirm it: {line}")
    return out


REGULAR = ("100644", "100755")


def _lock_modes(ref: str) -> dict[str, str]:
    """Git mode of every lock at ref, by path."""
    modes = {}
    for entry in git("ls-tree", "-r", "-z", ref).split("\0"):
        meta, _, p = entry.partition("\t")
        if p.endswith("/locked-tests.txt"):
            modes[p] = meta.split()[0]
    return modes


def _mode_findings(before: dict[str, str], after: dict[str, str]) -> list[str]:
    """A lock that is not a regular file, or changed type in the range, is a blocker."""
    out = []
    for p, mode in after.items():
        if mode not in REGULAR:
            out.append(f"blocker: {p}:1 — lock is not a regular file (symlink or other, mode {mode}), it can hide a re-approval")
        elif p in before and before[p] not in REGULAR:
            out.append(f"blocker: {p}:1 — lock changed type in the range (mode {before[p]} -> {mode}), confirm it")
    return out


def _canonical(path: str) -> str:
    """A lock's change, wherever it sits: archive/<name>/ counts as <name>/."""
    return re.sub(r"/archive/([^/]+/locked-tests\.txt)$", r"/\1", path)


def _locks_at(ref: str) -> dict[str, list[tuple[str, str]]]:
    """Every lock at ref, grouped by canonical path; more than one per key is reported."""
    listing = git("ls-tree", "-r", "-z", "--name-only", ref).split("\0")
    locks: dict[str, list[tuple[str, str]]] = {}
    for p in listing:
        if p.endswith("/locked-tests.txt"):
            locks.setdefault(_canonical(p), []).append((p, git("show", f"{ref}:{p}")))
    return locks


def _parse_lock(text: str) -> tuple[dict[str, tuple[str, int]], dict[str, list[int]]]:
    """(entry -> (sha, line), history line -> every line it appears on)."""
    entries, history = {}, {}
    for number, line in enumerate(text.splitlines(), 1):
        if line.startswith("#"):
            history.setdefault(line, []).append(number)
        elif "  " in line:
            sha, entry = line.split("  ", 1)
            entries[entry] = (sha, number)
    return entries, history


def evidence_findings(change: Path) -> list[str]:
    evidence = change / "evidence.md"
    if not evidence.is_file():
        return [f"blocker: {evidence}:1 — no evidence report"]
    text = re.sub(r"<!--.*?-->", "", evidence.read_text(), flags=re.DOTALL)
    findings = []
    for field in EVIDENCE_FIELDS:
        # A field's value is its own line plus indented continuation lines, so
        # an empty field never borrows the text of a following section.
        # After a blank line only a sub-bullet continues the field, so an empty
        # field never borrows an indented block that follows it.
        match = re.search(rf"^- \*\*{re.escape(field)}\*\*:(.*(?:\n[ \t]+\S.*|\n(?:[ \t]*\n)+[ \t]+[-*+] .*)*)", text, re.MULTILINE)
        line = text.count("\n", 0, match.start()) + 1 if match else 1
        value = match.group(1).strip() if match else ""
        if not value:
            findings.append(f"blocker: {evidence}:{line} — evidence field '{field}' is empty")
        elif field == "CI" and not NAMES_A_RUN.search(value):
            findings.append(f"blocker: {evidence}:{line} — evidence field 'CI' names no run: {value[:40]}")
    return findings


def review(change: Path, base: str) -> tuple[list[str], list[str]]:
    rng = f"{base}...HEAD"
    files = changed_files(rng)
    findings = []
    added = added_lines(rng)
    findings += lock_findings(base, files, added)
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
