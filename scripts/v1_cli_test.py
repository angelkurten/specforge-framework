#!/usr/bin/env python3
"""Tests for specforge/changes/2026-11-02-v1-out-of-the-cli: scenario 8. The repository's
SIBLINGS.md joins v1 under history/v1/, CI stops passing --ignore-sibling, and the
CHANGELOG, the migration guide and DECISIONS.md say what 1.0.0 does to doctor.

    python3 scripts/v1_cli_test.py          # from the specforge directory
"""

import re
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
REMOVED = ["prd-numbering", "prd-required-sections", "prd-back-refs", "prd-marketing-language",
           "prd-system-artifact-diff", "siblings-paths-resolve", "gate-block-yaml",
           "roadmap-evidence-categories", "roadmap-pii"]


def read(rel):
    return (REPO / rel).read_text(encoding="utf-8")


class V1Cli(unittest.TestCase):
    def test_8a_siblings_md_moved_and_history_readme_says_so(self):
        self.assertFalse((REPO / "SIBLINGS.md").exists())
        self.assertTrue((REPO / "history" / "v1" / "SIBLINGS.md").is_file())
        readme = read("history/v1/README.md")
        self.assertIn("history/v1/SIBLINGS.md", readme)
        # Fails against leaving the 3b sentence, which is false once the file moves.
        self.assertNotRegex(readme, r"SIBLINGS\.md`?, which stays at the repository root")

    def test_8b_ci_and_changelog(self):
        self.assertNotIn("ignore-sibling", read(".github/workflows/cli-ci.yml"))
        line7 = read("CHANGELOG.md").splitlines()[6]
        self.assertIn("specforge/DECISIONS.md", line7)
        self.assertNotIn("SIBLINGS.md", line7)

    def test_8c_the_guide_names_the_doctor_breaks(self):
        guide = read("docs/migration-v1-to-v2.md")
        self.assertRegex(guide, r"--erase[^\n]*(leav|keep)[^\n]*PRD")
        self.assertRegex(guide, r"--ignore-sibling[^\n]*exit[^\n]*2")
        for rule in REMOVED:
            self.assertIn(rule, guide, rule)
        self.assertRegex(guide, r"schema_version[^\n]*\"?2\"?")
        self.assertRegex(guide, r"exclusions")
        # A pre-0.11 install deletes its agents directory by hand.
        self.assertRegex(guide, r"0\.11[^\n]*agents|agents[^\n]*0\.11")

    def test_8d_decisions_has_the_corrected_count(self):
        self.assertRegex(read("specforge/DECISIONS.md"), r"\b9 of (doctor's )?16\b")


if __name__ == "__main__":
    unittest.main(verbosity=2)
