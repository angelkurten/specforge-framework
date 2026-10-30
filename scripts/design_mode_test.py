#!/usr/bin/env python3
"""Tests for specforge/changes/2026-10-29-reviewer-design-mode: the design panel is
specforge-reviewer's design mode, not v1's three reviewer agents. One test per
acceptance scenario, numbered the same way.

    python3 scripts/design_mode_test.py          # from the specforge directory
"""

import re
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
REVIEW = REPO / "specforge" / "core" / "review.md"
MODES = REPO / "specforge" / "core" / "modes.md"
REVIEWER = REPO / ".claude" / "agents" / "specforge" / "specforge-reviewer.md"
GUIDE = REPO / "docs" / "migration-v1-to-v2.md"
DECISIONS = REPO / "specforge" / "DECISIONS.md"
V1_AGENTS = ("specforge-backend-reviewer", "specforge-security-reviewer", "specforge-quality-reviewer")


def section(text, heading):
    """The body of a `## <heading>` section, up to the next `## ` heading."""
    m = re.search(rf"^## {re.escape(heading)}\s*$", text, re.M)
    if not m:
        return ""
    nxt = re.search(r"^## ", text[m.end():], re.M)
    return text[m.end():m.end() + nxt.start() if nxt else len(text)]


class DesignModeTests(unittest.TestCase):
    def test_1_review_md_has_a_design_mode_section(self):
        part = section(REVIEW.read_text(), "Design mode")
        self.assertTrue(part.strip(), "no ## Design mode section")
        for needle in ("Mode: design", "before Red", "§ Report"):
            self.assertIn(needle, part, needle)
        for perspective in ("backend", "security", "quality"):
            self.assertRegex(part.lower(), rf"\b{perspective}\b", perspective)
        self.assertRegex(part, r"contract and the code it names", "reads the contract and the code it names")
        self.assertRegex(part.lower(), r"no diff", "says there is no diff")
        self.assertLess(len(part.strip().splitlines()), 25)

    def test_2_each_perspective_names_its_focus(self):
        part = section(REVIEW.read_text(), "Design mode")
        lines = {p: next((l for l in part.splitlines() if re.search(rf"\*\*{p}\*\*", l, re.I)), "") for p in ("backend", "security", "quality")}
        self.assertRegex(lines["backend"].lower(), r"migration", lines["backend"])
        self.assertRegex(lines["backend"].lower(), r"rollback", lines["backend"])
        self.assertRegex(lines["security"].lower(), r"security checklist", lines["security"])
        self.assertRegex(lines["quality"], r"Acceptance", lines["quality"])
        self.assertRegex(lines["quality"].lower(), r"edge checklist", lines["quality"])

    def test_3_the_reviewer_definition_names_design_mode(self):
        text = REVIEWER.read_text()
        for needle in ("Mode: design", "Perspective", "§ Design mode"):
            self.assertIn(needle, text, needle)

    def test_4_modes_dispatches_the_reviewer_not_v1_agents(self):
        part = section(MODES.read_text(), "Design panel")
        for needle in ("specforge-reviewer", "Mode: design", "before Red"):
            self.assertIn(needle, part, needle)
        for perspective in ("backend", "security", "quality"):
            self.assertRegex(part.lower(), rf"\b{perspective}\b", perspective)
        self.assertRegex(part.lower(), r"optional")
        self.assertRegex(part.lower(), r"high risk|high-risk")
        # Fails against a panel that still dispatches v1's agents with their brief.
        for gone in (*V1_AGENTS, "REVIEW_MODE", "PRD_PATH", "SYSTEM_ARTIFACT_PATH"):
            self.assertNotIn(gone, part, gone)

    def test_5_the_guide_names_the_design_mode(self):
        text = GUIDE.read_text()
        self.assertIn("Mode: design", text)
        self.assertNotIn("v1's backend, security and quality reviewers", text)
        self.assertRegex(text, r"[Dd]esign panel")

    def test_6_decisions_records_the_design_mode_and_the_five_changes(self):
        text = DECISIONS.read_text()
        entries = re.split(r"^## ", text, flags=re.M)
        hit = [e for e in entries if "Mode: design" in e]
        self.assertTrue(hit, "no DECISIONS.md entry names Mode: design")
        self.assertRegex(hit[-1].lower(), r"five changes|5 changes", hit[-1][:200])


if __name__ == "__main__":
    unittest.main(verbosity=2)
