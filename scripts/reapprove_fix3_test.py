#!/usr/bin/env python3
"""Tests for the last re-verification findings on lock reporting in review_prep.py.

    python3 scripts/reapprove_fix3_test.py          # from the specforge directory

Scenarios 19-21 of specforge/changes/2026-10-24-reapprove-locked-tests/contract.md,
from the extra round the human granted. Reuses the fixtures from
scripts/reapprove_test.py, which is locked.
"""

import shutil
import subprocess
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from archive_test import CHANGE, LOCK, NAME  # noqa: E402
from reapprove_test import PREP, TEST, Fixture  # noqa: E402

LOCK_FILE = f"{CHANGE}/locked-tests.txt"


class LockReportTests(Fixture):
    def commit(self, message):
        self.git("add", "-A")
        self.git("commit", "-q", "-m", message)

    def findings(self, change, base):
        r = subprocess.run([sys.executable, str(PREP), change, "--base", base], cwd=self.root, capture_output=True, text=True)
        return [l for l in r.stdout.splitlines() if l.startswith(("should-fix: ", "blocker: ")) and "locked-tests.txt" in l]

    def weaken_and_reapprove(self, change, test=TEST):
        self.write(test, "def test_one():\n    assert True\n")
        r = subprocess.run([sys.executable, str(LOCK), "approve", change, test], cwd=self.root, capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr)

    def test_19_a_same_named_decoy_lock_does_not_hide_a_reapproval(self):
        base = self.git("rev-parse", "HEAD").strip()
        decoy = self.root / "specforge" / "changes" / "archive" / NAME / "locked-tests.txt"
        decoy.parent.mkdir(parents=True)
        shutil.copy(self.root / LOCK_FILE, decoy)
        self.weaken_and_reapprove(CHANGE)
        self.commit("decoy and reapprove")
        hits = self.findings(CHANGE, base)
        self.assertTrue(any(TEST in l and "hash" in l for l in hits), hits)
        self.assertTrue(any("more than one lock" in l for l in hits), hits)

    def test_20_a_non_ascii_change_path_is_compared(self):
        change = "specforge/changes/2026-10-24-démo"
        test = "tests/démo_test.py"
        self.write(f"{change}/contract.md", "# Démo\n\n**Mode**: Contract\n")
        self.write(f"{change}/evidence.md", (self.root / CHANGE / "evidence.md").read_text())
        self.write(test, "def test_one():\n    assert 1 + 1 == 2\n")
        r = subprocess.run([sys.executable, str(LOCK), "approve", change, test], cwd=self.root, capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.commit("demo")
        base = self.git("rev-parse", "HEAD").strip()
        self.weaken_and_reapprove(change, test)
        self.commit("reapprove demo")
        hits = self.findings(change, base)
        self.assertTrue(any(test in l and "hash" in l for l in hits), hits)

    def test_21_a_duplicated_history_line_is_reported(self):
        self.assertEqual(self.unlock(TEST).returncode, 0)
        self.assertEqual(self.lock_tool("approve", CHANGE, TEST).returncode, 0)
        self.commit("history")
        base = self.git("rev-parse", "HEAD").strip()
        unlocked = next(l for l in self.lock_text().splitlines() if l.startswith("# unlocked"))
        self.write(LOCK_FILE, unlocked + "\n" + self.lock_text())
        self.commit("duplicate history")
        hits = self.findings(CHANGE, base)
        self.assertTrue(any("added" in l and "# unlocked" in l for l in hits), hits)


if __name__ == "__main__":
    unittest.main()
