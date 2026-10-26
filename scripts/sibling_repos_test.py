#!/usr/bin/env python3
"""Tests for specforge/changes/2026-10-26-sibling-repos: v2 run from the specforge
sibling against a code sibling. One test per acceptance scenario, numbered the same way.

    python3 scripts/sibling_repos_test.py          # from the specforge directory

Each review test builds two throwaway git repositories side by side, `specforge/`
holding the change folder and `app/` holding the code, and runs review_prep.py
from `specforge/` with `--repo ../app`.
"""

import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
PREP = REPO / "specforge" / "scripts" / "review_prep.py"
GUARD = REPO / ".claude" / "hooks" / "specforge_lock_guard.py"
CHANGE = "specforge/changes/2026-10-26-demo"
OTHER = "specforge/changes/archive/2026-10-01-other"
APP_TEST = "def test_empty():\n    assert True\n\n\ndef test_sum():\n    assert 1 + 2 == 3\n"
EVIDENCE = """\
## Evidence

- **Ran**: python3 ../app/tests/app_test.py
- **Result**: 2 passed
- **CI**: run 1, green
- **Not checked**: nothing; every scenario ran
- **Deviations from the contract**: none
"""


def git(cwd, *args):
    return subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=True, check=True).stdout


def init(path, files):
    path.mkdir(parents=True)
    git(path, "init", "-q", "-b", "main")
    git(path, "config", "user.email", "t@example.com")
    git(path, "config", "user.name", "t")
    for rel, text in files.items():
        (path / rel).parent.mkdir(parents=True, exist_ok=True)
        (path / rel).write_text(text)
    git(path, "add", "-A")
    git(path, "commit", "-q", "-m", "base")
    return git(path, "rev-parse", "HEAD").strip()


class Siblings(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        base = Path(self.tmp.name)
        self.sf, self.app = base / "specforge", base / "app"
        sha = hashlib.sha256(APP_TEST.encode()).hexdigest()
        self.sf_base = init(self.sf, {
            f"{CHANGE}/contract.md": "# Demo\n\n**Mode**: Contract\n",
            f"{OTHER}/locked-tests.txt": f"{sha}  ../app/tests/app_test.py\n",
        })
        self.app_base = init(self.app, {
            "src/app.py": "def total(xs):\n    return sum(xs)\n",
            "tests/app_test.py": APP_TEST,
        })
        (self.sf / CHANGE / "evidence.md").write_text(EVIDENCE)
        git(self.sf, "add", "-A")
        git(self.sf, "commit", "-q", "-m", "evidence")

    def tearDown(self):
        self.tmp.cleanup()

    def app_change(self, edits=None, deletes=()):
        for rel, text in (edits or {}).items():
            (self.app / rel).parent.mkdir(parents=True, exist_ok=True)
            (self.app / rel).write_text(text)
        for rel in deletes:
            (self.app / rel).unlink()
        git(self.app, "add", "-A")
        git(self.app, "commit", "-q", "-m", "change")

    def review(self, *extra):
        args = list(extra) or ["--repo", "../app", "--repo-base", self.app_base]
        return subprocess.run([sys.executable, str(PREP), CHANGE, "--base", self.sf_base, *args],
                              cwd=self.sf, capture_output=True, text=True)

    def lines(self, r, severity):
        return [l for l in r.stdout.splitlines() if l.startswith(f"{severity}: ")]

    def test_1_the_packet_lists_sibling_files_and_names_both_ranges(self):
        self.app_change({"src/app.py": "def total(xs):\n    return sum(list(xs))\n"})
        r = self.review()
        self.assertIn("- M ../app/src/app.py", r.stdout)
        rng = next(l for l in r.stdout.splitlines() if l.startswith("Range:"))
        self.assertIn(f"{self.sf_base}...HEAD", rng)
        self.assertIn(f"../app {self.app_base}...HEAD", rng)

    def test_2_skip_and_stub_in_the_sibling_are_reported_at_their_lines(self):
        self.app_change({
            "tests/app_test.py": "import pytest\n\n\n@pytest.mark.skip\n" + APP_TEST,
            "src/app.py": "def total(xs):\n    # TODO handle None\n    return sum(xs)\n",
        })
        r = self.review()
        self.assertTrue(any("../app/tests/app_test.py:4" in l for l in self.lines(r, "blocker")), r.stdout)
        self.assertTrue(any("../app/src/app.py:2" in l for l in self.lines(r, "should-fix")), r.stdout)

    def test_3_a_deleted_sibling_test_file_or_function_is_a_blocker(self):
        self.app_change({"tests/app_test.py": "def test_empty():\n    assert True\n"})
        r = self.review()
        self.assertTrue(any("../app/tests/app_test.py:" in l and "test_sum" in l for l in self.lines(r, "blocker")), r.stdout)
        self.app_change(deletes=["tests/app_test.py"])
        r = self.review()
        self.assertTrue(any("../app/tests/app_test.py:1" in l and "deleted" in l for l in self.lines(r, "blocker")), r.stdout)

    def test_4_a_sibling_test_locked_by_another_change_is_should_fix(self):
        self.app_change({"tests/app_test.py": APP_TEST.replace("== 3", "== 4")})
        r = self.review()
        self.assertTrue(any("../app/tests/app_test.py" in l and "2026-10-01-other" in l
                            for l in self.lines(r, "should-fix")), r.stdout)

    def test_5_the_flags_go_together_and_repo_must_be_a_git_repository(self):
        for extra in (["--repo", "../app"], ["--repo-base", self.app_base]):
            r = self.review(*extra)
            self.assertEqual(r.returncode, 2, extra)
            # Fails against a script that does not know the flags: argparse rejects those too.
            self.assertNotIn("unrecognized arguments", r.stderr, extra)
            self.assertRegex(r.stderr, r"--repo.*--repo-base|--repo-base.*--repo", extra)
        (self.sf.parent / "plain").mkdir()
        r = self.review("--repo", "../plain", "--repo-base", "HEAD")
        self.assertEqual(r.returncode, 2)
        self.assertIn("../plain", r.stderr)
        self.assertNotIn("unrecognized arguments", r.stderr)
        self.assertNotIn("Traceback", r.stderr)


class GuardFailsClosed(unittest.TestCase):
    def run_guard(self, stdin, root):
        return subprocess.run([sys.executable, str(GUARD)], input=stdin, capture_output=True, text=True,
                              env=dict(os.environ, CLAUDE_PROJECT_DIR=str(root)))

    def test_6_an_unhandled_error_exits_2_without_a_traceback(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            # An active lock, so the guard reaches the path check instead of exiting 0 early.
            change = root / "specforge" / "changes" / "2026-10-26-demo"
            change.mkdir(parents=True)
            (root / "t_test.py").write_text("def test_a():\n    assert False\n")
            (change / "locked-tests.txt").write_text(f"{'0' * 64}  t_test.py\n")
            r = self.run_guard("not json", root)
            self.assertEqual(r.returncode, 2, r.stderr)
            self.assertIn("lock guard error", r.stderr)
            self.assertNotIn("Traceback", r.stderr)
            # An Edit whose file_path is not a string raises inside the check.
            r = self.run_guard(json.dumps({"tool_name": "Edit", "tool_input": {"file_path": 7}, "cwd": d}), root)
            self.assertEqual(r.returncode, 2, r.stderr)
            self.assertIn("lock guard error", r.stderr)
            self.assertNotIn("Traceback", r.stderr)
            r = self.run_guard(json.dumps({"tool_name": "Edit", "tool_input": {"file_path": str(root / "a.py")}, "cwd": d}), root)
            self.assertEqual(r.returncode, 0, r.stderr)


def section(text, heading):
    m = re.search(rf"^## {re.escape(heading)}\s*$(.*?)(?=^## |\Z)", text, re.M | re.S)
    return m.group(1) if m else ""


class Docs(unittest.TestCase):
    def test_7_loop_md_describes_sibling_repositories(self):
        body = section((REPO / "specforge" / "core" / "loop.md").read_text(), "Sibling repositories")
        for needle in ("--add-dir", "CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1", "git -C", "../<sibling>/"):
            self.assertIn(needle, body, needle)

    def test_8_contract_template_and_review_skill_name_the_sibling(self):
        context = section((REPO / "templates" / "contract.md").read_text(), "Context")
        self.assertRegex(context, r"sibling")
        self.assertIn("CLAUDE.md", context)
        skill = (REPO / ".claude" / "skills" / "specforge-review" / "SKILL.md").read_text()
        self.assertRegex(skill, r"--repo\b[^\n]*--repo-base|--repo-base[^\n]*--repo\b")
        self.assertRegex(skill, r"sibling")

    def test_9_the_guide_has_a_sibling_section(self):
        body = section((REPO / "docs" / "migration-v1-to-v2.md").read_text(), "Working on a sibling repository")
        for needle in ("--repo", "--add-dir", "../<sibling>"):
            self.assertIn(needle, body, needle)


if __name__ == "__main__":
    unittest.main(verbosity=2)
