#!/usr/bin/env python3
"""Tests for specforge/changes/2026-10-30-lock-checks: lock_tests.py approve refuses a
file holding an invisible character, and review_prep.py reports a test re-approved
after the lock's first version in the range. One test per acceptance scenario,
numbered the same way. Invisible characters are written with chr(), never literally.

    python3 scripts/lock_checks_test.py          # from the specforge directory
"""

import subprocess
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import review_test  # noqa: E402
from review_prep_lock_ci_test import Base  # noqa: E402

LOCK = HERE.parent / "specforge" / "scripts" / "lock_tests.py"
REVIEW = HERE.parent / "specforge" / "core" / "review.md"
CHANGE = review_test.CHANGE
RLO, BOM, ZWJ = chr(0x202E), chr(0xFEFF), chr(0x200D)


class Approve(Base):
    def run_approve(self, *paths):
        return subprocess.run([sys.executable, str(LOCK), "approve", CHANGE, *paths], cwd=self.root,
                              capture_output=True, text=True)

    def lock_bytes(self):
        p = self.root / CHANGE / "locked-tests.txt"
        return p.read_bytes() if p.exists() else None

    def test_1_an_invisible_character_is_refused_and_zwj_is_allowed(self):
        self.write("tests/bad_test.py", "def test_x():\n    assert 'a" + RLO + "b'\n")
        r = self.run_approve("tests/bad_test.py")
        self.assertEqual(r.returncode, 1, r.stdout + r.stderr)
        out = r.stdout + r.stderr
        self.assertIn("tests/bad_test.py:2", out)
        self.assertIn("U+202E", out)
        self.assertIsNone(self.lock_bytes())
        # An existing lock stays byte-identical.
        self.write("tests/ok_test.py", "def test_ok():\n    assert 'a" + ZWJ + "b'\n")
        self.assertEqual(self.run_approve("tests/ok_test.py").returncode, 0)
        before = self.lock_bytes()
        self.assertIsNotNone(before)
        self.assertEqual(self.run_approve("tests/bad_test.py").returncode, 1)
        self.assertEqual(self.lock_bytes(), before)

    def test_2_one_bad_file_refuses_the_whole_approval(self):
        # Fails against approving file by file: the clean one would be written.
        self.write("tests/ok_test.py", "def test_ok():\n    assert True\n")
        self.write("tests/bom_test.py", BOM + "def test_b():\n    assert True\n")
        r = self.run_approve("tests/ok_test.py", "tests/bom_test.py")
        self.assertEqual(r.returncode, 1, r.stdout + r.stderr)
        self.assertIn("U+FEFF", r.stdout + r.stderr)
        self.assertIsNone(self.lock_bytes())


class ReapprovedInRange(Base):
    def changed(self, r):
        return [l for l in self.lines(r, "should-fix") if "changed after the first approval" in l]

    def test_3_a_test_reapproved_after_the_lock_was_created_in_range_is_reported(self):
        self.write("tests/new_test.py", "def test_n():\n    assert 1 == 1\n")
        self.approve("tests/new_test.py")
        self.commit("lock")
        self.write("tests/new_test.py", "def test_n():\n    assert 2 == 2\n")
        self.approve("tests/new_test.py")
        self.write(f"{CHANGE}/evidence.md", review_test.EVIDENCE)
        self.commit("re-approve")
        hits = self.changed(self.review())
        self.assertEqual(len(hits), 1, hits)
        self.assertIn("tests/new_test.py", hits[0])
        # A lock approved once in the range reports nothing new.
        self.tearDown()
        self.setUp()
        self.write("tests/new_test.py", "def test_n():\n    assert 1 == 1\n")
        self.approve("tests/new_test.py")
        self.write(f"{CHANGE}/evidence.md", review_test.EVIDENCE)
        self.commit("lock once")
        self.assertEqual(self.changed(self.review()), [])

    def test_4_a_lock_at_the_base_keeps_its_report_and_is_not_reported_twice(self):
        self.write("tests/new_test.py", "def test_n():\n    assert 1 == 1\n")
        self.approve("tests/new_test.py")
        self.base = self.commit("lock at base")
        self.write("tests/new_test.py", "def test_n():\n    assert 2 == 2\n")
        self.approve("tests/new_test.py")
        self.write(f"{CHANGE}/evidence.md", review_test.EVIDENCE)
        self.commit("re-approve")
        r = self.review()
        self.assertEqual(self.changed(r), [], r.stdout)
        self.assertTrue(any("locked-tests.txt" in l for l in self.lines(r, "should-fix") + self.lines(r, "blocker")), r.stdout)


class Doc(unittest.TestCase):
    def test_5_review_md_names_the_new_report(self):
        text = REVIEW.read_text()
        part = text[text.index("## Lock changes"):]
        self.assertIn("changed after the first approval", part)


if __name__ == "__main__":
    unittest.main(verbosity=2)
