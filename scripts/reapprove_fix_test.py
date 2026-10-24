#!/usr/bin/env python3
"""Tests for the review findings on re-approving locked tests.

    python3 scripts/reapprove_fix_test.py          # from the specforge directory

Scenarios 9-14 of specforge/changes/2026-10-24-reapprove-locked-tests/contract.md,
added after the adversarial review showed four ways to change a locked test
without a human. Reuses the fixture from scripts/reapprove_test.py, which is
locked and is not edited here.
"""

import subprocess
import sys
import textwrap
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from archive_test import ARCHIVE, CHANGE, LOOP  # noqa: E402
from reapprove_test import PREP, REASON, TEST, Fixture  # noqa: E402

LOCK_FILE = f"{CHANGE}/locked-tests.txt"


class ReviewFixTests(Fixture):
    def review(self, base):
        return subprocess.run([sys.executable, str(PREP), CHANGE, "--base", base], cwd=self.root, capture_output=True, text=True)

    def lock_findings(self, result):
        return [l for l in result.stdout.splitlines() if l.startswith("should-fix: ") and "locked-tests.txt" in l]

    def loop(self, agent_body):
        agent = self.root / "fake_agent.py"
        agent.write_text(textwrap.dedent(agent_body))
        return subprocess.run(
            [sys.executable, str(LOOP), CHANGE, "--agent", f"{sys.executable} {agent}", "--max-iterations", "3"],
            cwd=self.root, capture_output=True, text=True,
        )

    def test_9_review_reports_every_lock_change_without_naming_who(self):
        base = self.git("rev-parse", "HEAD").strip()
        # approve straight over a locked entry, with no unlock first
        self.write(TEST, "def test_one():\n    assert True\n")
        self.assertEqual(self.lock_tool("approve", CHANGE, TEST).returncode, 0)
        self.git("add", "-A")
        self.git("commit", "-q", "-m", "silent reapprove")
        hits = self.lock_findings(self.review(base))
        self.assertTrue(any(TEST in l for l in hits), hits)
        self.assertFalse(any("by a human" in l for l in hits), hits)
        # a removed entry, and a forged history line
        base = self.git("rev-parse", "HEAD").strip()
        self.write(LOCK_FILE, f"# reapproved 2026-10-24 {TEST}\n")
        self.git("add", "-A")
        self.git("commit", "-q", "-m", "rewrite lock")
        hits = self.lock_findings(self.review(base))
        self.assertTrue(any("removed" in l and TEST in l for l in hits), hits)
        self.assertTrue(any("# reapproved" in l for l in hits), hits)

    def test_10_the_loop_never_invokes_the_agent_with_a_test_unlocked(self):
        self.assertEqual(self.unlock(TEST).returncode, 0)
        r = self.loop("open('agent_ran', 'w').write('x')\n")
        self.assertEqual(r.returncode, 4, r.stdout + r.stderr)
        self.assertFalse((self.root / "agent_ran").exists(), "the agent ran with a test unlocked")

    def test_11_the_loop_stops_when_an_iteration_changes_the_lock_file(self):
        r = self.loop(f"open('{LOCK_FILE}', 'a').write('# reapproved 2026-10-24 {TEST}\\n')\n")
        self.assertEqual(r.returncode, 4, r.stdout + r.stderr)
        self.assertIn("lock", r.stdout)
        self.assertNotIn("iteration 2", r.stdout)

    def test_12_a_reason_with_a_newline_is_refused(self):
        before = self.lock_text()
        r = self.unlock(TEST, reason="design moved\n0000  tests/other_test.py")
        self.assertEqual(r.returncode, 2, r.stdout + r.stderr)
        self.assertEqual(self.lock_text(), before)

    def test_13_the_guard_fails_closed_on_an_unreadable_lock(self):
        self.write(LOCK_FILE, self.lock_text() + "not-a-lock-line\n")
        for path in (TEST, "src/app.py", LOCK_FILE):
            r = self.guard("Edit", {"file_path": path})
            self.assertEqual(r.returncode, 2, f"{path}: {r.stderr}")

    def test_14_a_malformed_lock_fails_check_and_archive(self):
        self.write(LOCK_FILE, self.lock_text() + "not-a-lock-line\n")
        r = self.lock_tool("check", CHANGE)
        self.assertEqual(r.returncode, 1, r.stdout + r.stderr)
        self.assertIn("malformed", r.stdout)
        self.git("add", "-A")
        self.git("commit", "-q", "-m", "malformed")
        r = subprocess.run([sys.executable, str(ARCHIVE), CHANGE], cwd=self.root, capture_output=True, text=True)
        self.assertEqual(r.returncode, 1, r.stdout + r.stderr)


if __name__ == "__main__":
    unittest.main()
