#!/usr/bin/env python3
"""Tests for a locked-tests.txt that is a symlink.

    python3 scripts/symlinked_lock_test.py          # from the specforge directory

One test per acceptance scenario in
specforge/changes/2026-10-24-symlinked-lock/contract.md, numbered the same way.
Reuses the fixtures from scripts/archive_test.py and scripts/reapprove_test.py,
which are locked.
"""

import os
import subprocess
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from archive_test import CHANGE  # noqa: E402
from reapprove_test import PREP, TEST, Fixture  # noqa: E402

LOCK_FILE = f"{CHANGE}/locked-tests.txt"


class SymlinkedLockTests(Fixture):
    def commit(self, message):
        self.git("add", "-A")
        self.git("commit", "-q", "-m", message)

    def prep(self, change, base):
        r = subprocess.run([sys.executable, str(PREP), change, "--base", base], cwd=self.root, capture_output=True, text=True)
        return r, r.stdout.splitlines()

    def test_1_a_lock_replaced_by_a_symlink_spelling_the_base_text_is_a_blocker(self):
        base = self.git("rev-parse", "HEAD").strip()
        text = self.lock_text()
        lock = self.root / LOCK_FILE
        lock.unlink()
        # The link's target name is the base lock text, so `git show` returns
        # exactly what the base held and the text comparison sees no change.
        os.symlink(text, lock)
        self.write(TEST, "def test_one():\n    assert True\n")
        self.commit("swap the lock for a symlink and weaken the test")
        r, lines = self.prep(CHANGE, base)
        self.assertTrue(any(l.startswith("blocker: ") and LOCK_FILE in l and "symlink" in l for l in lines), r.stdout)
        self.assertEqual(r.returncode, 1, r.stdout + r.stderr)

    def test_2_a_lock_added_as_a_symlink_is_a_blocker(self):
        base = self.git("rev-parse", "HEAD").strip()
        change = "specforge/changes/2026-10-24-other"
        self.write(f"{change}/contract.md", "# Other\n\n**Mode**: Contract\n")
        self.write(f"{change}/evidence.md", (self.root / CHANGE / "evidence.md").read_text())
        os.symlink("../2026-10-23-demo/locked-tests.txt", self.root / change / "locked-tests.txt")
        self.commit("add a change whose lock is a symlink")
        r, lines = self.prep(change, base)
        self.assertTrue(
            any(l.startswith("blocker: ") and f"{change}/locked-tests.txt" in l and "symlink" in l for l in lines),
            r.stdout,
        )

    def test_3_a_regular_lock_reapproval_is_not_reported_as_a_symlink(self):
        # Fails against an implementation that flags every lock, or every lock
        # changed in the range: this one is a regular file re-approved by hand.
        base = self.git("rev-parse", "HEAD").strip()
        self.assertEqual(self.unlock(TEST).returncode, 0)
        self.write(TEST, "def test_one():\n    assert 2 + 2 == 4\n")
        self.assertEqual(self.lock_tool("approve", CHANGE, TEST).returncode, 0)
        self.commit("reapprove")
        r, lines = self.prep(CHANGE, base)
        self.assertTrue(any(l.startswith("should-fix: ") and TEST in l and "hash" in l for l in lines), r.stdout)
        self.assertFalse(any("symlink" in l for l in lines), r.stdout)

    def test_4_check_refuses_a_symlinked_lock(self):
        lock = self.root / LOCK_FILE
        copy = self.root / CHANGE / "real-lock.txt"
        copy.write_text(self.lock_text())
        lock.unlink()
        # The target holds a valid lock, so a check that follows the link passes.
        os.symlink("real-lock.txt", lock)
        r = self.lock_tool("check", CHANGE)
        self.assertEqual(r.returncode, 1, r.stdout + r.stderr)
        self.assertIn("symlink", r.stdout)


if __name__ == "__main__":
    unittest.main()
