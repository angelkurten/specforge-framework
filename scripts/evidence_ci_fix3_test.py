#!/usr/bin/env python3
"""Tests for the last review round on the evidence CI field.

    python3 scripts/evidence_ci_fix3_test.py          # from the specforge directory

Scenarios 11-14 of specforge/changes/2026-10-24-evidence-ci-field/contract.md.
Reuses the fixture from scripts/evidence_ci_test.py, which is locked.
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import evidence_ci_test as base  # noqa: E402

VALUE = "v2-ci run 1 and cli-ci run 1, both green on abc1234"


class EvidenceCiFix3Tests(base.EvidenceCiTests):
    test_1_a_missing_ci_field_is_a_blocker = None
    test_2_an_empty_ci_field_is_a_blocker = None
    test_3_a_filled_ci_field_passes = None
    test_4_archive_refuses_evidence_without_ci = None
    test_5_the_template_carries_a_ci_field = None

    def test_11_a_digit_that_is_no_run_reference_is_a_blocker(self):
        for value in ("`v2-ci`: pending", "v2-ci pending, cli-ci pending", "pending (2 workflows queued)",
                      "not run: CI takes ~10 min", "TBD, after PR #12 merges", "see Review, round 2"):
            self.evidence(base.COMPLETE.replace(VALUE, value))
            self.assertTrue(any("'CI'" in l for l in self.blockers()), f"{value}: {self.blockers()}")

    def test_12_run_references_pass(self):
        for value in ("`v2-ci` run 17, green", "v2-ci run #17: success",
                      "https://github.com/o/r/actions/runs/40059137308 green", "green on 27a1e92"):
            self.evidence(base.COMPLETE.replace(VALUE, value))
            self.assertEqual(self.blockers(), [], value)

    def test_13_an_empty_field_does_not_borrow_an_indented_block(self):
        text = base.COMPLETE.replace("- **Deviations from the contract**: none\n", "- **Deviations from the contract**:\n\n    some indented code\n")
        self.evidence(text)
        self.assertTrue(any("Deviations" in l for l in self.blockers()), self.blockers())

    def test_14_the_template_asks_for_the_runs_before_the_report(self):
        self.assertIn("before the commit that holds this report", base.TEMPLATE.read_text())


if __name__ == "__main__":
    unittest.main()
