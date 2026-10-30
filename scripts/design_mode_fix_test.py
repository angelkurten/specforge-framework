#!/usr/bin/env python3
"""Fix round of specforge/changes/2026-10-29-reviewer-design-mode (review PASS with two
should-fix and two nits): scenarios 7-10.

    python3 scripts/design_mode_fix_test.py          # from the specforge directory
"""

import re
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from design_mode_test import MODES, REVIEW, REVIEWER, section  # noqa: E402


class DesignModeFixTests(unittest.TestCase):
    def test_7_the_dispatch_names_the_contract(self):
        # Fails against a dispatch of only `Mode: design` and a `Perspective`: the reviewer has nothing to read.
        for path, heading in ((MODES, "Design panel"), (REVIEW, "Design mode")):
            self.assertIn("Contract:", section(path.read_text(), heading), path.name)

    def test_8_the_reviewer_may_run_premises_and_read_named_code_in_design_mode(self):
        step3 = next(l for l in REVIEWER.read_text().splitlines() if l.startswith("3."))
        self.assertIn("Mode: design", step3)
        self.assertRegex(step3, r"Premise", step3[:200])
        self.assertRegex(step3, r"named code|code (it|the contract) names", step3[:200])

    def test_9_review_md_opens_with_both_review_moments(self):
        opening = REVIEW.read_text().split("\n\n", 2)[1]
        self.assertRegex(opening, r"[Bb]efore Red", opening[:200])
        self.assertIn("Design mode", opening)

    def test_10_design_mode_says_what_checked_lists(self):
        part = section(REVIEW.read_text(), "Design mode")
        line = next((l for l in part.splitlines() if "CHECKED" in l), "")
        self.assertRegex(line.lower(), r"perspective", line)


if __name__ == "__main__":
    unittest.main(verbosity=2)
