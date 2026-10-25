#!/usr/bin/env python3
"""Second fix round after review (VERDICT: BLOCK) of specforge/changes/2026-10-25-loop-budget:
scenario 12 of its contract. Reuses the tampering agent of scripts/loop_budget_fix_test.py."""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from loop_budget_fix_test import TAMPER, LedgerTamperTests  # noqa: E402
from loop_budget_test import LEDGER  # noqa: E402


class LedgerRestoreTests(LedgerTamperTests):
    test_11_an_agent_that_alters_the_ledger_stops_the_loop = None  # runs in loop_budget_fix_test.py

    def test_12_an_altered_ledger_is_restored_and_the_iteration_recorded(self):
        # Fails against a loop.py that stops with exit 4 and leaves the tampered ledger on disk,
        # where the next run would read fewer lines and get its budget back.
        for action in TAMPER:
            with self.subTest(action=action):
                r = self.run_tampering(action)
                out = r.stdout + r.stderr
                self.assertEqual(r.returncode, 4, out)
                self.assertIn("restored", out)
                self.assertEqual((self.root / LEDGER).read_text().splitlines(), ["iteration 1 usd 0.1000", "iteration 2 usd 0.1000"])


if __name__ == "__main__":
    unittest.main()
