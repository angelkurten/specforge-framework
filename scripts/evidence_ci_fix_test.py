#!/usr/bin/env python3
"""Tests for the review findings on the evidence CI field.

    python3 scripts/evidence_ci_fix_test.py          # from the specforge directory

Scenarios 6-8 of specforge/changes/2026-10-24-evidence-ci-field/contract.md.
Reuses the fixture from scripts/evidence_ci_test.py, which is locked.
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import evidence_ci_test as base  # noqa: E402

COMPLETE = base.COMPLETE

CI_LINE = "- **CI**: v2-ci run 1 and cli-ci run 1, both green on abc1234\n"


class EvidenceCiFixTests(base.EvidenceCiTests):
    # Inherit the fixture only, not the five locked scenarios.
    test_1_a_missing_ci_field_is_a_blocker = None
    test_2_an_empty_ci_field_is_a_blocker = None
    test_3_a_filled_ci_field_passes = None
    test_4_archive_refuses_evidence_without_ci = None
    test_5_the_template_carries_a_ci_field = None

    def test_6_an_empty_ci_field_before_a_section_is_a_blocker(self):
        text = COMPLETE.replace(CI_LINE, "") + "- **CI**:\n\n## Review\n\nPASS\n"
        self.evidence(text)
        self.assertTrue(any("'CI'" in l for l in self.blockers()), self.blockers())

    def test_7_a_placeholder_ci_value_is_a_blocker(self):
        for placeholder in ("pending", "TBD", "[TBD]", "n/a", "-", "not run", "none"):
            self.evidence(COMPLETE.replace("v2-ci run 1 and cli-ci run 1, both green on abc1234", placeholder))
            self.assertTrue(any("'CI'" in l for l in self.blockers()), f"{placeholder}: {self.blockers()}")

    def test_8_real_values_still_pass(self):
        # A multi-line CI value, and "none" where it is a real answer (deviations).
        text = COMPLETE.replace(CI_LINE, "- **CI**:\n  - v2-ci run 1: green\n  - cli-ci run 1: green\n")
        self.evidence(text)
        self.assertEqual(self.blockers(), [])


if __name__ == "__main__":
    unittest.main()
