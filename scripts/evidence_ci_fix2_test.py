#!/usr/bin/env python3
"""Tests for the re-verification findings on the evidence CI field.

    python3 scripts/evidence_ci_fix2_test.py          # from the specforge directory

Scenarios 9-10 of specforge/changes/2026-10-24-evidence-ci-field/contract.md.
Reuses the fixture from scripts/evidence_ci_test.py, which is locked.
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import evidence_ci_test as base  # noqa: E402

VALUE = "v2-ci run 1 and cli-ci run 1, both green on abc1234"


class EvidenceCiFix2Tests(base.EvidenceCiTests):
    test_1_a_missing_ci_field_is_a_blocker = None
    test_2_an_empty_ci_field_is_a_blocker = None
    test_3_a_filled_ci_field_passes = None
    test_4_archive_refuses_evidence_without_ci = None
    test_5_the_template_carries_a_ci_field = None

    def test_9_a_ci_value_that_names_no_run_is_a_blocker(self):
        for value in ("`pending`", "**pending**", "_TBD_", "(pending)", "—", "CI pending", "green", "see Review", "None of the runs failed"):
            self.evidence(base.COMPLETE.replace(VALUE, value))
            self.assertTrue(any("'CI'" in l for l in self.blockers()), f"{value}: {self.blockers()}")

    def test_10_sub_bullets_after_a_blank_line_belong_to_the_field(self):
        text = base.COMPLETE.replace("- **Ran**: python3 -m pytest\n", "- **Ran**:\n\n  - python3 -m pytest\n")
        text = text.replace(f"- **CI**: {VALUE}\n", "- **CI**:\n\n  - v2-ci run 1: green\n")
        self.evidence(text)
        self.assertEqual(self.blockers(), [])


if __name__ == "__main__":
    unittest.main()
