#!/usr/bin/env python3
"""Tests for specforge/changes/2026-10-25-v2-adjustments: v2 is the default, with an
edge checklist, an edge test for Direct and an optional design panel. One test per
acceptance scenario, numbered the same way.

    python3 scripts/v2_adjustments_test.py          # from the specforge directory
"""

import re
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
REVIEW = REPO / "specforge" / "core" / "review.md"
MODES = REPO / "specforge" / "core" / "modes.md"
CLASSIFY = REPO / ".claude" / "skills" / "specforge-classify" / "SKILL.md"
DECISIONS = REPO / "specforge" / "DECISIONS.md"


def section(text, start):
    """The text from the line holding `start` to the next blank-line-separated heading or bold lead."""
    i = text.index(start)
    return text[i:i + 2000]


class V2AdjustmentsTests(unittest.TestCase):
    def test_1_review_states_an_edge_checklist_for_every_contract(self):
        text = REVIEW.read_text()
        self.assertIn("edge checklist", text.lower())
        part = section(text.lower(), "edge checklist")
        self.assertRegex(part, r"every contract and controlled")
        for item in ("bound", "normaliz", "control", "invisible", "widen"):
            self.assertIn(item, part, item)
        self.assertIn("2026-10-25-audit-fixes", text)

    def test_2_the_direct_row_names_an_edge_test(self):
        row = next(l for l in MODES.read_text().splitlines() if l.startswith("|") and "**Direct**" in l)
        artifacts = row.rstrip("|").split("|")[-1].lower()
        self.assertIn("edge", artifacts, row)
        self.assertIn("test", artifacts, row)

    def test_3_modes_describes_the_optional_design_panel(self):
        text = MODES.read_text()
        self.assertIn("design panel", text.lower())
        part = section(text, "esign panel")
        # Changed by specforge/changes/2026-10-29-reviewer-design-mode (approved by the human):
        # the panel is specforge-reviewer's design mode, not v1's three reviewer agents.
        for needle in ("specforge-reviewer", "Mode: design", "backend", "security", "quality", "before Red"):
            self.assertIn(needle, part, needle)
        self.assertRegex(part.lower(), r"optional")
        self.assertRegex(part.lower(), r"high risk|high-risk")

    def test_4_classify_says_direct_lands_with_an_edge_test(self):
        step5 = next(l for l in CLASSIFY.read_text().splitlines() if l.startswith("5."))
        self.assertRegex(step5.lower(), r"direct.*edge test|edge test.*direct", step5)

    def test_5_decisions_records_v2_as_the_default(self):
        text = DECISIONS.read_text()
        m = re.search(r"^## 2026-10-25 — [^\n]*v2[^\n]*default[^\n]*$", text, re.M | re.I)
        self.assertIsNotNone(m, "no 2026-10-25 entry making v2 the default")
        entry = text[m.start():].split("\n## ", 1)[0]
        for field in ("**Context**", "**Decision**", "**Rejected**", "**Revisit if**"):
            self.assertIn(field, entry, field)
        decision = entry.split("**Decision**", 1)[1].split("**Rejected**", 1)[0].lower()
        for adjustment in ("edge checklist", "edge test", "design panel"):
            self.assertIn(adjustment, decision, adjustment)


if __name__ == "__main__":
    unittest.main()
