#!/usr/bin/env python3
"""Mechanical review of a change, and the packet the adversarial reviewer reads.

    python3 specforge/scripts/review_prep.py specforge/changes/<change> --base main

Diffs `<base>...HEAD` and reports what a pattern can decide on its own:

    blocker     a skip marker added, a test file deleted, a test function
                removed, a locked test changed, evidence.md missing or with an
                empty field
    should-fix  a stub added: TODO, FIXME, NotImplementedError, "not implemented";
                a literal invisible character (Unicode Cf except U+200C/U+200D,
                plus U+2028/U+2029) on an added line, prose included: write the escape

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
import os
import re
import subprocess
import sys
import unicodedata
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
# ZWNJ and ZWJ are legitimate (Persian, emoji sequences); every other format
# character is invisible, and so are the two Unicode line separators.
VALID_INVISIBLE = {"\u200c", "\u200d"}
EVIDENCE_FIELDS = ("Ran", "Result", "CI", "Not checked", "Deviations from the contract")
# A CI value must name a run: `run 17`, `run #17`, an /actions/runs/<id> URL,
# or a commit hash with a digit. A placeholder, wrapped or not, or a workflow
# name alone (`v2-ci`: pending) names none.
NAMES_A_RUN = re.compile(r"\brun\s*#?\d+\b|/actions/runs/\d+|\b(?=[0-9a-f]*\d)[0-9a-f]{7,40}\b", re.IGNORECASE)


def git(*args: str, repo: Path | None = None) -> str:
    # quotePath=false: a non-ASCII path is printed as itself, not "d\\303\\251mo",
    # so every path test below sees the real name.
    cmd = ["git", *(["-C", str(repo)] if repo else []), "-c", "core.quotePath=false", *args]
    return subprocess.run(cmd, capture_output=True, text=True, check=True).stdout


def changed_files(rng: str, repo: Path | None = None) -> list[tuple[str, str]]:
    out = git("diff", "--no-renames", "--name-status", rng, repo=repo)
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


def added_lines(rng: str, repo: Path | None = None) -> list[tuple[str, int, str]]:
    """Every added line as (path, new line number, text); a sibling's paths are prefixed with <repo>/."""
    out = git("diff", "--no-renames", "-U0", rng, repo=repo)
    prefix = f"{repo.as_posix()}/" if repo else ""
    path, line, added = None, 0, []
    for raw in out.split("\n"):  # not splitlines: it also splits on U+2028
        if raw.startswith("+++ "):
            path = raw[6:] if raw.startswith("+++ b/") else None
        elif raw.startswith("@@"):
            line = int(re.match(r"@@ -\S+ \+(\d+)", raw).group(1))
        elif raw.startswith("+") and path:
            added.append((prefix + path, line, raw[1:]))
            line += 1
    return added


def invisible_points(text: str) -> list[str]:
    """Each distinct invisible code point in text, as U+XXXX, in order of appearance."""
    points = dict.fromkeys(
        f"U+{ord(c):04X}"
        for c in text
        if c not in VALID_INVISIBLE and (unicodedata.category(c) == "Cf" or c in "\u2028\u2029")
    )
    return list(points)


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
    out += _added_entries(base, before, after)
    for key, copies in after.items():
        if key not in before:
            for path, text in copies:
                for line, numbers in _parse_lock(text)[1].items():
                    for number in numbers:
                        out.append(f"should-fix: {path}:{number} — lock history added, confirm it: {line}")
    return out


def _added_entries(base: str, before: dict, after: dict) -> list[str]:
    """Entries at HEAD that the lock's first version in the range lacks: added after the first approval."""
    first = dict(before)
    if any(key not in before for key in after):
        for commit in git("rev-list", "--reverse", f"{base}..HEAD").split():
            for key, copies in _locks_at(commit).items():
                first.setdefault(key, copies)
    out = []
    for key, copies in after.items():
        known = {e for _, text in first.get(key, []) for e in _parse_lock(text)[0]}
        for path, text in copies:
            for entry, (_, number) in _parse_lock(text)[0].items():
                if entry not in known:
                    out.append(f"should-fix: {path}:{number} — approved entry added after the first approval, confirm it: {entry}")
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
    paired = {_canonical(p): mode for p, mode in before.items()}
    for p, mode in after.items():
        old = paired.get(_canonical(p))
        if mode not in REGULAR:
            out.append(f"blocker: {p}:1 — lock is not a regular file (symlink or other, mode {mode}), it can hide a re-approval")
        elif old is not None and old not in REGULAR:
            out.append(f"blocker: {p}:1 — lock changed type in the range (mode {old} -> {mode}), confirm it")
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


def foreign_lock_findings(change: Path, base: str, files: list[tuple[str, str]]) -> list[str]:
    """A test another change locked, archived or not, that the range edits or deletes.

    check_locked() covers only the change under review, and `lock_tests.py`
    enforces no archived lock, so without this a test approved elsewhere can be
    edited and re-locked with no finding (change 2026-10-26-release-0-28-0)."""
    own = _canonical(f"{change.as_posix().rstrip('/')}/locked-tests.txt")
    # Resolved on both sides so a symlinked sibling still matches its lock entry
    touched = {(Path.cwd() / path).resolve() for status, path in files if status in ("M", "D")}
    out = []
    for key, copies in _locks_at(base).items():
        if key == own:
            continue
        for lock_path, text in copies:
            for entry in _parse_lock(text)[0]:
                if (Path.cwd() / entry).resolve() in touched:
                    name = Path(lock_path).parent.name
                    out.append(f"should-fix: {entry}:1 — test locked by {name} ({lock_path}) changed in the range, confirm it")
    return out


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


def _field(text: str, field: str) -> tuple[str, int]:
    """(value, line) of an evidence field: its own line plus indented continuation lines.

    After a blank line only a sub-bullet continues the field, so an empty field
    never borrows an indented block that follows it. Shared by evidence_findings
    and ci_commit_findings so the two read the CI field identically."""
    match = re.search(rf"^- \*\*{re.escape(field)}\*\*:(.*(?:\n[ \t]+\S.*|\n(?:[ \t]*\n)+[ \t]+[-*+] .*)*)", text, re.MULTILINE)
    line = text.count("\n", 0, match.start()) + 1 if match else 1
    return (match.group(1).strip() if match else ""), line


def ci_commit_findings(change: Path, base: str, pairs: list[tuple[Path, str]]) -> list[str]:
    evidence = change / "evidence.md"
    if not evidence.is_file():
        return []
    text = re.sub(r"<!--.*?-->", "", evidence.read_text(), flags=re.DOTALL)
    value, ci_line = _field(text, "CI")
    tokens = re.findall(r"\b[0-9a-f]{7,40}\b", value, re.IGNORECASE)
    # The change's folder, live or archived, holds no code.
    name, changes = change.name, (change.parent.parent if change.parent.name == "archive" else change.parent)
    own = [f":(exclude){changes / name}", f":(exclude){changes / 'archive' / name}"]
    findings = []
    # The change folder's own commits (the evidence) are not code in specforge; in a sibling every file is.
    for label, repo, ref, spec in [("specforge", None, base, ["--", ".", *own])] + [
        (r.as_posix(), r, ref, []) for r, ref in pairs
    ]:
        last = git("log", "-1", "--format=%H", f"{ref}..HEAD", *spec, repo=repo).strip()
        named = []
        for tok in tokens:
            try:
                named.append(git("rev-parse", "--verify", "-q", f"{tok}^{{commit}}", repo=repo).strip())
            except subprocess.CalledProcessError:
                pass  # resolves to no commit here: does not count as naming one
        if last and named and not any(last.startswith(t.lower()) for t in tokens):
            findings.append(f"should-fix: {evidence}:{ci_line} — CI field names no run on the last code commit {last[:7]} of {label}")
    return findings


def evidence_findings(change: Path) -> list[str]:
    evidence = change / "evidence.md"
    if not evidence.is_file():
        return [f"blocker: {evidence}:1 — no evidence report"]
    text = re.sub(r"<!--.*?-->", "", evidence.read_text(), flags=re.DOTALL)
    findings = []
    for field in EVIDENCE_FIELDS:
        value, line = _field(text, field)
        if not value:
            findings.append(f"blocker: {evidence}:{line} — evidence field '{field}' is empty")
        elif field == "CI" and not NAMES_A_RUN.search(value):
            findings.append(f"blocker: {evidence}:{line} — evidence field 'CI' names no run: {value[:40]}")
    return findings


def review(change: Path, base: str, pairs: list[tuple[Path, str]] = ()) -> tuple[list[str], list[str]]:
    rng = f"{base}...HEAD"
    files = changed_files(rng)
    # Each sibling's paths are reported as <repo>/<file>, the form lock entries use.
    by_repo = [(repo, ref, changed_files(f"{ref}...HEAD", repo)) for repo, ref in pairs]
    sibling = [(s, f"{repo.as_posix()}/{p}") for repo, _, fs in by_repo for s, p in fs]
    findings = []
    added = added_lines(rng)
    findings += lock_findings(base, files, added)
    code_added = added + [a for repo, ref in pairs for a in added_lines(f"{ref}...HEAD", repo)]
    for path, number, text in code_added:
        if points := invisible_points(text):
            findings.append(f"should-fix: {path}:{number} — literal invisible character {', '.join(points)}; write the escape")
    for path, number, text, code in code_lines(code_added):
        if SKIP.search(code):
            findings.append(f"blocker: {path}:{number} — skip marker added: {text.strip()}")
        if STUB.search(code) or THROWN_STUB.search(text):
            findings.append(f"should-fix: {path}:{number} — stub added: {text.strip()}")
    sources = [(s, p, p, base, None) for s, p in files]
    sources += [(s, f"{repo.as_posix()}/{p}", p, ref, repo) for repo, ref, fs in by_repo for s, p in fs]
    for status, path, rel, ref, root in sources:
        if not TEST_FILE.search(rel):
            continue
        if status == "D":
            findings.append(f"blocker: {path}:1 — test file deleted")
        elif status == "M":
            before = test_names(git("show", f"{ref}:{rel}", repo=root))
            after = test_names((root / rel if root else Path(rel)).read_text())
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
    for repo, ref, fs in by_repo:
        if not fs:
            findings.append(f"blocker: {repo.as_posix()}:1 — range {ref}...HEAD is empty: nothing to review")
    for path in check_locked(change, Path.cwd()):
        findings.append(f"blocker: {path}:1 — locked test changed")
    findings += foreign_lock_findings(change, base, files + sibling)
    findings += evidence_findings(change)
    findings += ci_commit_findings(change, base, list(pairs))
    return [f"{s} {p}" for s, p in files + sibling], findings


def packet(change: Path, base: str, files: list[str], findings: list[str], pairs: list[tuple[Path, str]] = ()) -> str:
    rng = f"{base}...HEAD" + "".join(f"; {repo.as_posix()} {ref}...HEAD" for repo, ref in pairs)
    return "\n".join(
        [
            "# Review packet",
            "",
            f"Contract: {change / 'contract.md'}",
            f"Evidence: {change / 'evidence.md'}",
            f"Range: {rng}",
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
            f"(git diff {base}...HEAD"
            + "".join(f"; git -C {repo.as_posix()} diff {ref}...HEAD" for repo, ref in pairs)
            + "). The findings above are settled; look for what a "
            "pattern cannot see.",
        ]
    )


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Mechanical review of a change.")
    parser.add_argument("change", type=Path, help="the change folder")
    parser.add_argument("--base", default="main", help="the ref the change branched from (default: main)")
    parser.add_argument("--repo", type=Path, action="append", default=[],
                        help="a code sibling, e.g. ../app; repeat per sibling, each with its --repo-base")
    parser.add_argument("--repo-base", action="append", default=[], help="the ref that sibling branched from")
    args = parser.parse_args(argv)
    if len(args.repo) != len(args.repo_base):
        parser.error(f"--repo and --repo-base go together as pairs: got {len(args.repo)} --repo, {len(args.repo_base)} --repo-base")
    pairs = []
    for repo, ref_name in zip(args.repo, args.repo_base):
        top = subprocess.run(["git", "-C", str(repo), "rev-parse", "--show-toplevel"],
                             capture_output=True, text=True)
        if top.returncode:
            parser.error(f"--repo {repo} is not a git repository")
        # Report every path as lock entries write it, relative to the cwd: /abs/app, ../app and ../app/tests alike.
        ref = subprocess.run(["git", "-C", top.stdout.strip(), "rev-parse", "--verify", f"{ref_name}^{{commit}}"],
                             capture_output=True, text=True)
        if ref.returncode:
            parser.error(f"--repo-base {ref_name} is not a commit in {repo}")
        norm = Path(os.path.relpath(Path(top.stdout.strip()).resolve(), Path.cwd().resolve()))
        if dup := next((r for r, _ in pairs if r == norm), None):
            parser.error(f"--repo {repo} given twice: {dup.as_posix()} is already paired")
        pairs.append((norm, ref_name))
    files, findings = review(args.change, args.base, pairs)
    print(packet(args.change, args.base, files, findings, pairs))
    return 1 if any(f.startswith("blocker: ") for f in findings) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
