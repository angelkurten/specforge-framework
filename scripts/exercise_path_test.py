#!/usr/bin/env python3
"""Tests for specforge/changes/2026-10-29-exercise-the-path: the evidence exercises the
user-visible path end to end. One test per acceptance scenario, numbered the same way.
Each prose check looks for phrases only its own item carries.

    python3 scripts/exercise_path_test.py          # from the specforge directory
"""

import re
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent


def section(text, heading):
    m = re.search(rf"^## {re.escape(heading)}\s*$(.*?)(?=^## |\Z)", text, re.M | re.S)
    return m.group(1) if m else ""


class ExercisePathTests(unittest.TestCase):
    def test_1_the_template_has_an_exercised_field_between_result_and_ci(self):
        text = (REPO / "templates" / "evidence-report.md").read_text()
        at = [text.find(f) for f in ("- **Result**:", "- **Exercised**:", "- **CI**:")]
        self.assertNotIn(-1, at, at)
        self.assertEqual(at, sorted(at), at)
        line = next(l for l in text.splitlines() if l.startswith("- **Exercised**:"))
        self.assertIn("none — ", line)
        self.assertRegex(line, r"end to end")

    def test_2_review_md_blocks_a_not_checked_user_visible_path(self):
        body = section((REPO / "specforge" / "core" / "review.md").read_text(), "What the reviewer checks")
        bullet = next((l for l in body.splitlines() if l.startswith("- **Exercised")), "")
        self.assertTrue(bullet, body[:400])
        for needle in ("not a fake", "blocker", "2026-10-29"):
            self.assertIn(needle, bullet, needle)
        self.assertRegex(bullet, r"Not checked")

    def test_3_the_review_skill_runs_the_path_before_dispatching(self):
        text = (REPO / ".claude" / "skills" / "specforge-review" / "SKILL.md").read_text()
        steps = re.findall(r"^\d+\. .*$", text, re.M)
        run = next((i for i, s in enumerate(steps) if "Exercised" in s and re.search(r"user-visible path", s)), None)
        dispatch = next((i for i, s in enumerate(steps) if "Dispatch the `specforge-reviewer`" in s), None)
        self.assertIsNotNone(run, steps)
        self.assertIsNotNone(dispatch, steps)
        self.assertLess(run, dispatch)

    def test_4_decisions_records_exercising_the_path(self):
        text = (REPO / "specforge" / "DECISIONS.md").read_text()
        m = re.search(r"^## 2026-10-29 — [^\n]*exercise[^\n]*$(.*?)(?=^## |\Z)", text, re.M | re.S | re.I)
        self.assertTrue(m, "no 2026-10-29 entry on exercising the path")
        body = m.group(1)
        for field in ("**Context**:", "**Decision**:", "**Rejected**:", "**Revisit if**:"):
            self.assertIn(field, body, field)
        self.assertIn("CORS", body)


if __name__ == "__main__":
    unittest.main(verbosity=2)
