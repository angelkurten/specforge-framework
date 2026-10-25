#!/usr/bin/env python3
"""Tests for specforge/changes/2026-10-25-ledger-hardlink: the ledger never writes
through a hard link, and a non-UTF-8 ledger is exit 4. One test per acceptance
scenario, numbered the same way. Reuses the fixture from scripts/archive_test.py."""

import os
import subprocess
import sys
import textwrap
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from archive_test import CHANGE, LOOP, REPO, Repo  # noqa: E402
from loop_budget_test import LEDGER, progress  # noqa: E402

PRECIOUS = b"precious bytes, not a ledger\n"


class LedgerHardLinkTests(Repo):
    def run_with(self, body, tick=False):
        self.marker = self.root / "agent-ran"
        self.marker.unlink(missing_ok=True)
        self.write(f"{CHANGE}/progress.md", progress("5 iterations", 1))
        agent = self.root / "agent.py"
        tick_line = (
            f"p = Path({str(self.root / CHANGE / 'progress.md')!r}); p.write_text(p.read_text().replace('- [ ]', '- [x]', 1))\n"
            if tick else ""
        )
        agent.write_text(textwrap.dedent(f"""\
            import json, os
            from pathlib import Path
            ledger = Path({str(self.root / LEDGER)!r})
            victim = Path({str(self.victim)!r})
            Path({str(self.marker)!r}).write_text("ran")
        """) + body + "\n" + tick_line + "print(json.dumps({'total_cost_usd': 0.1}))\n")
        return subprocess.run(
            [sys.executable, str(LOOP), CHANGE, "--agent", f"{sys.executable} {agent}"],
            cwd=self.root, capture_output=True, text=True,
        )

    def setUp(self):
        super().setUp()
        self.victim = self.root / "victim.txt"
        self.victim.write_bytes(PRECIOUS)

    def test_1_a_hard_link_swapped_in_during_an_iteration_is_not_written_through(self):
        # Fails against an in-place write_bytes: the restore would overwrite victim.txt.
        self.write(LEDGER, "iteration 1 usd 0.1000\n")
        r = self.run_with("ledger.unlink(); os.link(victim, ledger)")
        out = r.stdout + r.stderr
        self.assertEqual(r.returncode, 4, out)
        self.assertIn("restored", out)
        self.assertEqual(self.victim.read_bytes(), PRECIOUS)
        self.assertEqual((self.root / LEDGER).read_text().splitlines(), ["iteration 1 usd 0.1000", "iteration 2 usd 0.1000"])

    def test_2_a_ledger_that_is_already_a_hard_link_is_not_appended_through(self):
        # Fails against an in-place append: the iteration line would land in victim.txt.
        ledger = self.root / LEDGER
        self.victim.write_bytes(b"iteration 1 usd 0.1000\n")
        ledger.parent.mkdir(parents=True, exist_ok=True)
        os.link(self.victim, ledger)
        r = self.run_with("", tick=True)
        out = r.stdout + r.stderr
        self.assertEqual(r.returncode, 0, out)
        self.assertEqual(self.victim.read_bytes(), b"iteration 1 usd 0.1000\n")
        self.assertEqual(ledger.read_text().splitlines(), ["iteration 1 usd 0.1000", "iteration 2 usd 0.1000"])

    def test_3_a_non_utf8_ledger_is_exit_4_before_any_agent(self):
        (self.root / LEDGER).write_bytes(b"iteration 1 usd 0.1\xff\n")
        r = self.run_with("")
        out = r.stdout + r.stderr
        self.assertEqual(r.returncode, 4, out)
        self.assertIn("loop-runs.txt", out)
        self.assertNotIn("Traceback", out)
        self.assertFalse(self.marker.exists(), "the agent ran on an undecodable ledger")

    def test_4_loop_md_no_longer_lists_these_gaps(self):
        text = (REPO / "specforge" / "core" / "loop.md").read_text()
        self.assertNotIn("hard link", text)
        self.assertNotIn("non-UTF-8", text)


if __name__ == "__main__":
    unittest.main()
