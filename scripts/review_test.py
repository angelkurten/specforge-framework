#!/usr/bin/env python3
"""Tests for scripts/review_prep.py.

    python3 scripts/review_test.py          # from the specforge directory

One test per acceptance scenario in
changes/2026-10-23-adversarial-reviewer/contract.md, numbered the same way.
Each builds a throwaway git repository with a base commit, applies one change
on top, commits it, and runs the script against that range.
"""

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
PREP = HERE / "review_prep.py"
LOCK = HERE / "lock_tests.py"

CHANGE = "changes/2026-10-23-demo"

BASE_FILES = {
    "src/app.py": "def total(xs):\n    return sum(xs)\n",
    "tests/app_test.py": (
        "from src.app import total\n\n\n"
        "def test_empty():\n    assert total([]) == 0\n\n\n"
        "def test_sum():\n    assert total([1, 2]) == 3\n"
    ),
    "tests/other_test.py": "def test_other():\n    assert True is True\n",
    f"{CHANGE}/contract.md": "# Demo\n\n**Mode**: Contract\n",
}

EVIDENCE = """\
## Evidence

- **Ran**: python3 -m pytest
- **Result**: 3 passed
- **Not checked**: nothing; every scenario ran
- **Deviations from the contract**: none
"""


class Repo(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.git("init", "-q", "-b", "main")
        self.git("config", "user.email", "t@example.com")
        self.git("config", "user.name", "t")
        for path, text in BASE_FILES.items():
            self.write(path, text)
        self.git("add", "-A")
        self.git("commit", "-q", "-m", "base")
        self.base = self.git("rev-parse", "HEAD").strip()

    def tearDown(self):
        self.tmp.cleanup()

    def git(self, *args):
        return subprocess.run(
            ["git", *args], cwd=self.root, capture_output=True, text=True, check=True
        ).stdout

    def write(self, path, text):
        file = self.root / path
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_text(text)

    def change(self, edits=None, deletes=(), evidence=EVIDENCE):
        if evidence is not None:
            self.write(f"{CHANGE}/evidence.md", evidence)
        for path, text in (edits or {}).items():
            self.write(path, text)
        for path in deletes:
            (self.root / path).unlink()
        self.git("add", "-A")
        self.git("commit", "-q", "-m", "change")

    def review(self):
        return subprocess.run(
            [sys.executable, str(PREP), CHANGE, "--base", self.base],
            cwd=self.root,
            capture_output=True,
            text=True,
        )

    def assertFinding(self, result, severity, where):
        lines = [l for l in result.stdout.splitlines() if l.startswith(f"{severity}: ")]
        self.assertTrue(
            any(where in l for l in lines),
            f"no {severity} at {where} in:\n{result.stdout}\n{result.stderr}",
        )


class ReviewPrepTests(Repo):
    def test_1_clean_change_exits_0_and_packet_names_contract_and_files(self):
        self.change({"src/app.py": "def total(xs):\n    return sum(xs, 0)\n"})
        r = self.review()
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn(f"{CHANGE}/contract.md", r.stdout)
        self.assertIn("src/app.py", r.stdout)
        self.assertNotIn("blocker: ", r.stdout)

    def test_2_skip_markers_are_blockers_at_their_line(self):
        markers = [
            ("tests/app_test.py", "import pytest\n\n\n@pytest.mark.skip\ndef test_empty():\n    assert False\n\n\ndef test_sum():\n    assert True\n", 4),
            ("tests/a_test.py", "import unittest\n\n@unittest.skip('later')\ndef test_a():\n    pass\n", 3),
            ("web/a.test.js", "describe('a', () => {\n  it.skip('works', () => {});\n});\n", 2),
            ("web/b.test.js", "describe('b', () => {\n  xit('works', () => {});\n});\n", 2),
            ("go/a_test.go", "package a\n\nfunc TestA(t *testing.T) {\n\tt.Skip(\"flaky\")\n}\n", 4),
            ("java/ATest.java", "class ATest {\n  @Disabled\n  void a() {}\n}\n", 2),
        ]
        self.change({path: text for path, text, _ in markers})
        r = self.review()
        for path, _, line in markers:
            self.assertFinding(r, "blocker", f"{path}:{line}")

    def test_3_deleting_a_test_file_is_a_blocker(self):
        self.change(deletes=["tests/other_test.py"])
        self.assertFinding(self.review(), "blocker", "tests/other_test.py")

    def test_4_removing_a_test_function_is_a_blocker(self):
        self.change({"tests/app_test.py": "from src.app import total\n\n\ndef test_empty():\n    assert total([]) == 0\n"})
        r = self.review()
        self.assertFinding(r, "blocker", "tests/app_test.py")
        self.assertIn("test_sum", r.stdout)

    def test_5_stubs_are_should_fix_at_their_line(self):
        self.change({
            "src/app.py": "def total(xs):\n    # TODO handle None\n    return sum(xs)\n\n\ndef mean(xs):\n    raise NotImplementedError\n",
            "web/c.js": "export function f() {\n  throw new Error('not implemented');\n}\n",
        })
        r = self.review()
        self.assertFinding(r, "should-fix", "src/app.py:2")
        self.assertFinding(r, "should-fix", "src/app.py:7")
        self.assertFinding(r, "should-fix", "web/c.js:2")

    def test_6_a_changed_locked_test_is_a_blocker(self):
        subprocess.run([sys.executable, str(LOCK), "approve", CHANGE, "tests/app_test.py"], cwd=self.root, check=True)
        self.git("add", "-A")
        self.git("commit", "-q", "-m", "lock")
        self.base = self.git("rev-parse", "HEAD").strip()
        self.change({"tests/app_test.py": BASE_FILES["tests/app_test.py"].replace("== 3", "== 4")})
        self.assertFinding(self.review(), "blocker", "tests/app_test.py")

    def test_7_missing_or_incomplete_evidence_is_a_blocker(self):
        self.change({"src/app.py": "def total(xs):\n    return sum(xs, 0)\n"}, evidence=None)
        self.assertFinding(self.review(), "blocker", f"{CHANGE}/evidence.md")
        self.write(f"{CHANGE}/evidence.md", EVIDENCE.replace("- **Not checked**: nothing; every scenario ran", "- **Not checked**:"))
        self.git("add", "-A")
        self.git("commit", "-q", "-m", "evidence")
        r = self.review()
        self.assertFinding(r, "blocker", f"{CHANGE}/evidence.md")
        self.assertIn("Not checked", r.stdout)

    def test_8_any_blocker_exits_1_and_still_prints_the_packet(self):
        self.change(deletes=["tests/other_test.py"])
        r = self.review()
        self.assertEqual(r.returncode, 1, r.stdout + r.stderr)
        self.assertIn(f"{CHANGE}/contract.md", r.stdout)
        self.assertIn("tests/other_test.py", r.stdout)


if __name__ == "__main__":
    unittest.main()
