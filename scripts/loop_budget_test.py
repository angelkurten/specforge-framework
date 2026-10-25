#!/usr/bin/env python3
"""Tests for the cumulative loop budget: the budget is the change's, not the run's.

    python3 scripts/loop_budget_test.py          # from the specforge directory

One test per acceptance scenario in
specforge/changes/2026-10-25-loop-budget/contract.md, numbered the same way.
Reuses the fixture from scripts/archive_test.py: a git repository holding one
change whose test tests/demo_test.py is locked.
"""

import subprocess
import sys
import textwrap
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from archive_test import ARCHIVED, CHANGE, LOOP, REPO, Repo  # noqa: E402

LOOP_RULE = REPO / "specforge" / "core" / "loop.md"
LEDGER = f"{CHANGE}/loop-runs.txt"


def progress(budget, tasks, done=0):
    boxes = "".join(f"- [x] done_{i}\n" for i in range(done)) + "".join(f"- [ ] task_{i}\n" for i in range(tasks))
    return f"# Progress\n\n**Budget**: {budget}\n\n## Tasks\n\n{boxes}\n## Blocked\n\n## Log\n"


class LoopBudgetTests(Repo):
    def run_loop(self, budget, tasks, ledger=None, cost=0.0, tick=0, extra=(), done=0):
        """Run loop.py with a fake agent that records its iteration, reports `cost` and ticks `tick` tasks."""
        self.write(f"{CHANGE}/progress.md", progress(budget, tasks, done))
        if ledger is not None:
            self.write(LEDGER, ledger)
        self.marker = self.root / "agent-ran"
        agent = self.root / "fake_agent.py"
        agent.write_text(textwrap.dedent(f"""\
            import json, os
            from pathlib import Path
            with open({str(self.marker)!r}, "a") as f:
                f.write(os.environ["SPECFORGE_ITERATION"] + "\\n")
            p = Path({str(self.root / CHANGE / "progress.md")!r})
            text = p.read_text()
            for _ in range({tick}):
                text = text.replace("- [ ]", "- [x]", 1)
            p.write_text(text)
            print(json.dumps({{"total_cost_usd": {cost}}}))
        """))
        return subprocess.run(
            [sys.executable, str(LOOP), CHANGE, *extra, "--agent", f"{sys.executable} {agent}"],
            cwd=self.root, capture_output=True, text=True,
        )

    def ran(self):
        return self.marker.read_text().split() if self.marker.exists() else []

    def ledger(self):
        file = self.root / LEDGER
        return file.read_text().splitlines() if file.exists() else []

    def test_1_a_budget_below_the_tasks_left_does_not_start(self):
        r = self.run_loop("1 iterations", tasks=2)
        out = r.stdout + r.stderr
        self.assertEqual(r.returncode, 2, out)
        self.assertEqual(self.ran(), [], "the agent ran although the budget cannot finish")
        self.assertRegex(out, r"\b1 iterations? left\b")
        self.assertRegex(out, r"\b2 tasks? left\b")

    def test_2_a_budget_equal_to_the_tasks_left_starts(self):
        # Fails against a refusal that counts ticked tasks too: 3 boxes, 1 already ticked, 2 left.
        r = self.run_loop("2 iterations", tasks=2, done=1, tick=2)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertEqual(self.ran(), ["1"])

    def test_3_each_iteration_appends_a_ledger_line(self):
        r = self.run_loop("5 iterations", tasks=1, cost=0.25, tick=1)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertEqual(self.ledger(), ["iteration 1 usd 0.2500"])

    def test_4_a_second_run_continues_the_count(self):
        r = self.run_loop("5 iterations", tasks=1, ledger="iteration 1 usd 0.1000\n", cost=0.3, tick=1)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertEqual(self.ran(), ["2"])
        self.assertIn("iteration 2", r.stdout)
        self.assertEqual(self.ledger(), ["iteration 1 usd 0.1000", "iteration 2 usd 0.3000"])

    def test_5_spent_iterations_count_against_the_cap(self):
        r = self.run_loop("2 iterations", tasks=1, ledger="iteration 1 usd 0.1000\niteration 2 usd 0.1000\n")
        self.assertEqual(r.returncode, 2, r.stdout + r.stderr)
        self.assertEqual(self.ran(), [], "the agent ran past a spent budget")

    def test_6_spent_cost_counts_against_the_cap(self):
        r = self.run_loop("5 iterations, 1 USD", tasks=2, ledger="iteration 1 usd 0.4000\niteration 2 usd 0.5000\n", cost=0.2)
        self.assertEqual(r.returncode, 3, r.stdout + r.stderr)
        self.assertEqual(self.ran(), ["3"])
        self.assertIn("1.10", r.stdout)
        self.marker.unlink()
        (self.root / LEDGER).write_text("iteration 1 usd 0.5000\niteration 2 usd 0.5000\n")
        r = self.run_loop("5 iterations, 1 USD", tasks=2, cost=0.2)
        self.assertEqual(r.returncode, 3, r.stdout + r.stderr)
        self.assertEqual(self.ran(), [], "the agent ran with the cost cap already spent")

    def test_7_max_iterations_overrides_the_budget_line(self):
        r = self.run_loop("1 iterations", tasks=1, ledger="iteration 1 usd 0.1000\n", tick=1, extra=("--max-iterations", "3"))
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertEqual(self.ran(), ["2"])

    def test_8_a_malformed_ledger_line_stops_before_any_agent(self):
        r = self.run_loop("5 iterations", tasks=1, ledger="iteration 1 usd 0.1000\nthree iterations, trust me\n")
        out = r.stdout + r.stderr
        self.assertEqual(r.returncode, 4, out)
        self.assertIn("three iterations, trust me", out)
        self.assertEqual(self.ran(), [])

    def test_9_archive_moves_the_ledger(self):
        r = self.run_loop("5 iterations", tasks=1, cost=0.1, tick=1)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.write(f"{CHANGE}/progress.md", progress("5 iterations", 1).replace("- [ ]", "- [x]"))
        self.git("add", "-A")
        self.git("commit", "-q", "-m", "run")
        a = self.archive()
        self.assertEqual(a.returncode, 0, a.stdout + a.stderr)
        self.assertTrue((self.root / ARCHIVED / "loop-runs.txt").is_file())

    def test_10_the_docs_say_the_budget_is_cumulative(self):
        for text in (LOOP_RULE.read_text(), LOOP.read_text()):
            self.assertIn("loop-runs.txt", text)
            self.assertIn("cumulative", text.lower())


if __name__ == "__main__":
    unittest.main()
