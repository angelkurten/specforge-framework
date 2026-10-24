#!/usr/bin/env python3
"""Tests for the re-verification findings on lock reporting in review_prep.py.

    python3 scripts/reapprove_fix2_test.py          # from the specforge directory

Scenarios 15-18 of specforge/changes/2026-10-24-reapprove-locked-tests/contract.md.
Reuses the fixtures from scripts/reapprove_test.py, which is locked.
"""

import subprocess
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from archive_test import ARCHIVE, ARCHIVED, CHANGE  # noqa: E402
from reapprove_test import PREP, TEST, Fixture  # noqa: E402

LOCK_FILE = f"{CHANGE}/locked-tests.txt"


class LockReportTests(Fixture):
    def commit(self, message):
        self.git("add", "-A")
        self.git("commit", "-q", "-m", message)

    def lock_findings(self, change, base):
        r = subprocess.run([sys.executable, str(PREP), change, "--base", base], cwd=self.root, capture_output=True, text=True)
        return [l for l in r.stdout.splitlines() if l.startswith(("should-fix: ", "blocker: ")) and "locked-tests.txt" in l]

    def test_15_a_deleted_lock_is_reported(self):
        base = self.git("rev-parse", "HEAD").strip()
        (self.root / LOCK_FILE).unlink()
        self.write(TEST, "def test_one():\n    assert True\n")
        self.commit("drop lock")
        hits = self.lock_findings(CHANGE, base)
        self.assertTrue(any(TEST in l for l in hits), hits)

    def test_16_removed_history_lines_are_reported(self):
        self.assertEqual(self.unlock(TEST).returncode, 0)
        self.assertEqual(self.lock_tool("approve", CHANGE, TEST).returncode, 0)
        self.commit("history")
        base = self.git("rev-parse", "HEAD").strip()
        kept = [l for l in self.lock_text().splitlines() if not l.startswith("#")]
        self.write(LOCK_FILE, "\n".join(kept) + "\n")
        self.commit("strip history")
        hits = self.lock_findings(CHANGE, base)
        self.assertTrue(any("removed" in l and "# unlocked" in l for l in hits), hits)
        self.assertTrue(any("removed" in l and "# reapproved" in l for l in hits), hits)

    def test_17_a_dirty_tree_does_not_hide_a_committed_reapproval(self):
        base = self.git("rev-parse", "HEAD").strip()
        old_test, old_lock = (self.root / TEST).read_text(), self.lock_text()
        self.write(TEST, "def test_one():\n    assert True\n")
        self.assertEqual(self.lock_tool("approve", CHANGE, TEST).returncode, 0)
        self.commit("reapprove")
        self.write(TEST, old_test)
        self.write(LOCK_FILE, old_lock)
        hits = self.lock_findings(CHANGE, base)
        self.assertTrue(any(TEST in l and "hash" in l for l in hits), hits)

    def test_18_a_reapproval_archived_in_the_same_range_is_reported(self):
        base = self.git("rev-parse", "HEAD").strip()
        self.write(TEST, "def test_one():\n    assert True\n")
        self.assertEqual(self.lock_tool("approve", CHANGE, TEST).returncode, 0)
        self.commit("reapprove")
        r = subprocess.run([sys.executable, str(ARCHIVE), CHANGE], cwd=self.root, capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.commit("archive")
        hits = self.lock_findings(ARCHIVED, base)
        self.assertTrue(any(TEST in l and "hash" in l for l in hits), hits)


if __name__ == "__main__":
    unittest.main()
