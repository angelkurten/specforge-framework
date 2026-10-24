#!/usr/bin/env python3
"""Tests for the review findings on a symlinked lock.

    python3 scripts/symlinked_lock_fix_test.py          # from the specforge directory

Scenarios 5-9 of specforge/changes/2026-10-24-symlinked-lock/contract.md,
added after the first review. Reuses the fixtures from scripts/archive_test.py
and scripts/reapprove_test.py, which are locked.
"""

import os
import shutil
import subprocess
import sys
import textwrap
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from archive_test import ARCHIVED, CHANGE, LOOP  # noqa: E402
from reapprove_test import PREP, TEST, Fixture  # noqa: E402

LOCK_FILE = f"{CHANGE}/locked-tests.txt"


class SymlinkedLockFixTests(Fixture):
    def commit(self, message):
        self.git("add", "-A")
        self.git("commit", "-q", "-m", message)

    def prep(self, change, base):
        r = subprocess.run([sys.executable, str(PREP), change, "--base", base], cwd=self.root, capture_output=True, text=True)
        return r, r.stdout.splitlines()

    def symlink_lock(self):
        """Replace the lock with a symlink to a valid copy, so a reader that follows it sees a good lock."""
        lock = self.root / LOCK_FILE
        (self.root / CHANGE / "real-lock.txt").write_text(lock.read_text())
        lock.unlink()
        os.symlink("real-lock.txt", lock)

    def test_5_archive_refuses_a_symlinked_lock(self):
        self.symlink_lock()
        # Committed, so archive.py's "differs from the last commit" refusal
        # cannot be what stops it: only the symlink check can.
        self.commit("lock as a symlink")
        r = self.archive()
        self.assertEqual(r.returncode, 1, r.stdout + r.stderr)
        self.assertIn("symlink", r.stdout + r.stderr)
        self.assertNotMoved()

    def test_6_the_loop_does_not_start_on_a_symlinked_lock(self):
        self.symlink_lock()
        marker = self.root / "agent-ran"
        agent = self.root / "fake_agent.py"
        agent.write_text(textwrap.dedent(
            f"""\
            from pathlib import Path
            Path({str(marker)!r}).write_text("ran")
            """
        ))
        r = subprocess.run(
            [sys.executable, str(LOOP), CHANGE, "--agent", f"{sys.executable} {agent}"],
            cwd=self.root, capture_output=True, text=True,
        )
        self.assertEqual(r.returncode, 4, r.stdout + r.stderr)
        self.assertIn("symlink", r.stdout + r.stderr)
        self.assertFalse(marker.exists(), "the agent ran before the lock was checked")

    def test_7_a_lock_that_was_a_symlink_at_the_base_is_a_blocker(self):
        self.symlink_lock()
        self.commit("lock as a symlink")
        base = self.git("rev-parse", "HEAD").strip()
        lock = self.root / LOCK_FILE
        text = lock.read_text()
        lock.unlink()
        lock.write_text(text)
        self.commit("lock back to a regular file")
        r, lines = self.prep(CHANGE, base)
        self.assertTrue(any(l.startswith("blocker: ") and LOCK_FILE in l and "type" in l for l in lines), r.stdout)

    def test_8_a_type_change_with_an_archive_move_is_a_blocker(self):
        self.symlink_lock()
        self.commit("lock as a symlink")
        base = self.git("rev-parse", "HEAD").strip()
        lock = self.root / LOCK_FILE
        text = lock.read_text()
        lock.unlink()
        lock.write_text(text)
        (self.root / ARCHIVED).parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(self.root / CHANGE), str(self.root / ARCHIVED))
        self.commit("regular lock, archived")
        r, lines = self.prep(ARCHIVED, base)
        self.assertTrue(
            any(l.startswith("blocker: ") and f"{ARCHIVED}/locked-tests.txt" in l and "type" in l for l in lines),
            r.stdout,
        )

    def test_9_a_regular_lock_reapproval_gets_no_lock_blocker(self):
        # Fails against an implementation that emits any lock blocker, symlink
        # or type change, on every lock changed in the range: this one is a
        # regular file re-approved through unlock and approve.
        base = self.git("rev-parse", "HEAD").strip()
        self.assertEqual(self.unlock(TEST).returncode, 0)
        self.write(TEST, "def test_one():\n    assert 2 + 2 == 4\n")
        self.assertEqual(self.lock_tool("approve", CHANGE, TEST).returncode, 0)
        self.commit("reapprove")
        r, lines = self.prep(CHANGE, base)
        self.assertTrue(any(l.startswith("should-fix: ") and TEST in l and "hash" in l for l in lines), r.stdout)
        self.assertFalse(any(l.startswith("blocker: ") and "locked-tests.txt" in l for l in lines), r.stdout)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)


if __name__ == "__main__":
    unittest.main()
