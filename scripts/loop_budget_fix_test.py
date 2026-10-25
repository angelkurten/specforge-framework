#!/usr/bin/env python3
"""Fix round after review (VERDICT: BLOCK) of specforge/changes/2026-10-25-loop-budget:
scenario 11 of its contract. Reuses the fixture from scripts/archive_test.py and the
progress builder from scripts/loop_budget_test.py."""

import subprocess
import sys
import textwrap
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from archive_test import CHANGE, LOOP, Repo  # noqa: E402
from loop_budget_test import LEDGER, progress  # noqa: E402

TAMPER = {
    "truncate": "ledger.write_text('')",
    "forge": "ledger.open('a').write('iteration 9 usd 0.0000\\n')",
    "delete": "ledger.unlink()",
}


class LedgerTamperTests(Repo):
    def run_tampering(self, action):
        """One prior ledger line; an agent that alters the ledger during its iteration and ticks nothing."""
        self.write(LEDGER, "iteration 1 usd 0.1000\n")
        self.write(f"{CHANGE}/progress.md", progress("5 iterations", 2))
        agent = self.root / "tampering_agent.py"
        agent.write_text(textwrap.dedent(f"""\
            import json
            from pathlib import Path
            ledger = Path({str(self.root / LEDGER)!r})
            {TAMPER[action]}
            print(json.dumps({{"total_cost_usd": 0.1}}))
        """))
        return subprocess.run(
            [sys.executable, str(LOOP), CHANGE, "--agent", f"{sys.executable} {agent}"],
            cwd=self.root, capture_output=True, text=True,
        )

    def test_11_an_agent_that_alters_the_ledger_stops_the_loop(self):
        # Fails against a loop.py that never re-checks the ledger: truncating or deleting it would reset the budget.
        for action in TAMPER:
            with self.subTest(action=action):
                r = self.run_tampering(action)
                out = r.stdout + r.stderr
                self.assertEqual(r.returncode, 4, out)
                self.assertIn("loop-runs.txt", out)
                self.assertNotIn("iteration 3", r.stdout)


if __name__ == "__main__":
    unittest.main()
