#!/usr/bin/env python3
"""Tests for re-approving locked tests: lock_tests.py unlock, then approve.

    python3 scripts/reapprove_test.py          # from the specforge directory

One test per acceptance scenario in
specforge/changes/2026-10-24-reapprove-locked-tests/contract.md, numbered the
same way. Reuses the fixture from scripts/archive_test.py: a git repository
holding one finished change whose test tests/demo_test.py is locked.
"""

import json
import subprocess
import sys
import textwrap
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from archive_test import ARCHIVE, CHANGE, LOCK, LOOP, Repo  # noqa: E402

PREP = LOCK.parent / "review_prep.py"
TEST = "tests/demo_test.py"
REASON = "the design moved v2 under specforge/"


class Fixture(Repo):
    def lock_text(self):
        return (self.root / CHANGE / "locked-tests.txt").read_text()

    def lock_tool(self, *args):
        return subprocess.run([sys.executable, str(LOCK), *args], cwd=self.root, capture_output=True, text=True)

    def unlock(self, *paths, reason=REASON):
        args = ["unlock", CHANGE, *(["--reason", reason] if reason is not None else []), *paths]
        return self.lock_tool(*args)


class ReapproveTests(Fixture):
    def test_1_unlock_without_a_reason_is_refused(self):
        before = self.lock_text()
        # Exit 2 alone would pass against a script with no unlock at all, which
        # rejects any unknown command; the message must name the missing reason.
        for reason in (None, "  "):
            r = self.unlock(TEST, reason=reason)
            self.assertEqual(r.returncode, 2, r.stdout + r.stderr)
            self.assertIn("--reason", r.stderr)
        self.assertEqual(self.lock_text(), before)

    def test_2_unlock_of_a_path_not_locked_is_refused(self):
        before = self.lock_text()
        r = self.unlock("tests/other_test.py")
        self.assertEqual(r.returncode, 1, r.stdout + r.stderr)
        self.assertEqual(self.lock_text(), before)

    def test_3_unlock_records_it_and_opens_only_that_test(self):
        self.write("tests/second_test.py", "def test_two():\n    assert True\n")
        self.assertEqual(self.lock_tool("approve", CHANGE, "tests/second_test.py").returncode, 0)
        r = self.unlock(TEST)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        text = self.lock_text()
        self.assertIn(f"UNLOCKED  {TEST}", text)
        self.assertTrue(any(l.startswith("# unlocked") and TEST in l and REASON in l for l in text.splitlines()), text)
        r = self.lock_tool("check", CHANGE)
        self.assertEqual(r.returncode, 1, r.stdout)
        self.assertIn("awaiting re-approval", r.stdout)
        self.assertEqual(self.guard("Edit", {"file_path": TEST}).returncode, 0)
        self.assertEqual(self.guard("Edit", {"file_path": "tests/second_test.py"}).returncode, 2)
        self.assertEqual(self.guard("Edit", {"file_path": f"{CHANGE}/locked-tests.txt"}).returncode, 2)

    def test_4_approve_after_unlock_relocks_and_keeps_the_history(self):
        self.assertEqual(self.unlock(TEST).returncode, 0)
        self.write(TEST, "def test_one():\n    assert 2 + 2 == 4\n")
        self.assertEqual(self.lock_tool("approve", CHANGE, TEST).returncode, 0)
        lines = self.lock_text().splitlines()
        self.assertFalse(any(l.startswith("UNLOCKED") for l in lines), lines)
        self.assertTrue(any(l.startswith("# unlocked") and REASON in l for l in lines), lines)
        self.assertTrue(any(l.startswith("# reapproved") and TEST in l for l in lines), lines)
        self.assertEqual(self.lock_tool("check", CHANGE).returncode, 0)

    def test_5_archive_refuses_while_a_test_is_unlocked(self):
        self.assertEqual(self.unlock(TEST).returncode, 0)
        self.git("add", "-A")
        self.git("commit", "-q", "-m", "unlock")
        r = subprocess.run([sys.executable, str(ARCHIVE), CHANGE], cwd=self.root, capture_output=True, text=True)
        self.assertEqual(r.returncode, 1, r.stdout + r.stderr)
        self.assertTrue((self.root / CHANGE / "contract.md").is_file())

    def test_6_the_loop_does_not_run_with_an_unlocked_test(self):
        self.assertEqual(self.unlock(TEST).returncode, 0)
        agent = self.root / "fake_agent.py"
        agent.write_text("pass\n")
        r = subprocess.run(
            [sys.executable, str(LOOP), CHANGE, "--agent", f"{sys.executable} {agent}"],
            cwd=self.root, capture_output=True, text=True,
        )
        self.assertEqual(r.returncode, 4, r.stdout + r.stderr)
        self.assertNotIn("iteration 2", r.stdout)

    def test_7_the_guard_asks_a_human_before_an_unlock(self):
        cmd = f"python3 specforge/scripts/lock_tests.py unlock {CHANGE} --reason 'x' {TEST}"
        r = self.guard("Bash", {"command": cmd})
        self.assertEqual(r.returncode, 0, r.stderr)
        out = json.loads(r.stdout)["hookSpecificOutput"]
        self.assertEqual(out["hookEventName"], "PreToolUse")
        self.assertEqual(out["permissionDecision"], "ask")
        self.assertIn("human", out["permissionDecisionReason"])
        r = self.guard("Bash", {"command": cmd + f" && echo x > {TEST}"})
        self.assertEqual(r.returncode, 2, r.stdout + r.stderr)

    def test_8_review_prep_reports_an_unlock_with_its_reason(self):
        base = self.git("rev-parse", "HEAD").strip()
        self.assertEqual(self.unlock(TEST).returncode, 0)
        self.write(TEST, "def test_one():\n    assert 2 + 2 == 4\n")
        self.assertEqual(self.lock_tool("approve", CHANGE, TEST).returncode, 0)
        self.git("add", "-A")
        self.git("commit", "-q", "-m", "reapprove")
        r = subprocess.run([sys.executable, str(PREP), CHANGE, "--base", base], cwd=self.root, capture_output=True, text=True)
        hits = [l for l in r.stdout.splitlines() if l.startswith("should-fix: ") and TEST in l and REASON in l]
        self.assertTrue(hits, r.stdout)


if __name__ == "__main__":
    unittest.main()
