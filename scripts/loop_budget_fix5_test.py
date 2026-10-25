#!/usr/bin/env python3
"""Fix round after review (VERDICT: BLOCK) of specforge/changes/2026-10-25-ledger-hardlink:
scenario 5 of its contract. Reuses the fixture of scripts/loop_budget_fix4_test.py."""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from loop_budget_fix4_test import PRECIOUS, LedgerHardLinkTests  # noqa: E402
from loop_budget_test import LEDGER  # noqa: E402

PLANT = {
    "hard link": "os.link(victim, ledger.parent / 'loop-runs.txt.tmp')",
    "symlink": "os.symlink(victim, ledger.parent / 'loop-runs.txt.tmp')",
    "directory": "(ledger.parent / 'loop-runs.txt.tmp').mkdir()",
}


class TempPathTests(LedgerHardLinkTests):
    # Only the new scenario runs here; the inherited ones run in loop_budget_fix4_test.py.
    test_1_a_hard_link_swapped_in_during_an_iteration_is_not_written_through = None
    test_2_a_ledger_that_is_already_a_hard_link_is_not_appended_through = None
    test_3_a_non_utf8_ledger_is_exit_4_before_any_agent = None
    test_4_loop_md_no_longer_lists_these_gaps = None

    def test_5_a_link_or_directory_planted_at_the_temp_path_is_never_written_through(self):
        # Fails against a fixed, predictable temp name written with write_bytes, which follows
        # a planted link and overwrites the file it points at.
        for name, plant in PLANT.items():
            with self.subTest(plant=name):
                self.victim.write_bytes(PRECIOUS)
                tmp = self.root / LEDGER
                for stale in (tmp.parent / "loop-runs.txt.tmp",):
                    if stale.is_symlink() or stale.is_file():
                        stale.unlink()
                    elif stale.is_dir():
                        stale.rmdir()
                self.write(LEDGER, "iteration 1 usd 0.1000\n")
                r = self.run_with(plant, tick=True)
                out = r.stdout + r.stderr
                self.assertNotIn("Traceback", out)
                self.assertEqual(r.returncode, 0, out)
                self.assertEqual(self.victim.read_bytes(), PRECIOUS)
                self.assertEqual((self.root / LEDGER).read_text().splitlines(), ["iteration 1 usd 0.1000", "iteration 2 usd 0.1000"])


if __name__ == "__main__":
    unittest.main()
