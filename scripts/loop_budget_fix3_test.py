#!/usr/bin/env python3
"""Third fix round after review (VERDICT: BLOCK) of specforge/changes/2026-10-25-loop-budget:
scenarios 13 and 14 of its contract. Reuses the fixture from scripts/archive_test.py."""

import subprocess
import sys
import textwrap
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from archive_test import CHANGE, LOOP, Repo  # noqa: E402
from loop_budget_test import LEDGER, progress  # noqa: E402

SWAP = {
    "symlink to /dev/null": "ledger.unlink(); ledger.symlink_to('/dev/null')",
    "directory": "ledger.unlink(); ledger.mkdir()",
}


class LedgerTypeTests(Repo):
    def run_with(self, body):
        self.marker = self.root / "agent-ran"
        self.marker.unlink(missing_ok=True)
        self.write(f"{CHANGE}/progress.md", progress("5 iterations", 2))
        agent = self.root / "agent.py"
        agent.write_text(textwrap.dedent(f"""\
            import json
            from pathlib import Path
            ledger = Path({str(self.root / LEDGER)!r})
            Path({str(self.marker)!r}).write_text("ran")
        """) + body + "\nprint(json.dumps({'total_cost_usd': 0.1}))\n")
        return subprocess.run(
            [sys.executable, str(LOOP), CHANGE, "--agent", f"{sys.executable} {agent}"],
            cwd=self.root, capture_output=True, text=True,
        )

    def test_13_a_ledger_that_is_not_a_regular_file_stops_every_run(self):
        # Fails against a loop.py that reads a symlink or a directory as an empty ledger,
        # where a rerun would start at iteration 1 with the whole budget.
        for name, swap in SWAP.items():
            with self.subTest(swap=name):
                ledger = self.root / LEDGER
                if ledger.is_dir() and not ledger.is_symlink():
                    ledger.rmdir()
                else:
                    ledger.unlink(missing_ok=True)
                self.write(LEDGER, "iteration 1 usd 0.1000\n")
                r = self.run_with(swap)
                out = r.stdout + r.stderr
                self.assertEqual(r.returncode, 4, out)
                self.assertIn("loop-runs.txt", out)
                self.assertNotIn("Traceback", out)
                r = self.run_with("")
                out = r.stdout + r.stderr
                self.assertEqual(r.returncode, 4, out)
                self.assertFalse(self.marker.exists(), "a rerun ran the agent on a ledger that is not a regular file")

    def test_14_a_ledger_change_does_not_hide_a_changed_locked_test(self):
        # Fails against a ledger check that returns before the locked-test check.
        self.write(LEDGER, "iteration 1 usd 0.1000\n")
        r = self.run_with(f"ledger.write_text(''); Path({str(self.root / 'tests' / 'demo_test.py')!r}).write_text('def test_one():\\n    pass\\n')")
        out = r.stdout + r.stderr
        self.assertEqual(r.returncode, 4, out)
        self.assertIn("loop-runs.txt", out)
        self.assertIn("tests/demo_test.py", out)


if __name__ == "__main__":
    unittest.main()
