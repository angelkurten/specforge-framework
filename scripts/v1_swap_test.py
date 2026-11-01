#!/usr/bin/env python3
"""Tests for specforge/changes/2026-11-01-v1-package-swap: scenarios 4-6, numbered the
same way. The moved files sit under history/v1/, the v2 rule and CLAUDE.md say what
they must, and the migration guide tells an adopter what 1.0.0 does.

    python3 scripts/v1_swap_test.py          # from the specforge directory
"""

import re
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
RULES = ["hard-rules", "workflow", "gate-block", "prd-authoring", "roadmap", "model-selection", "adr-specific", "framework-maintenance"]
AGENTS = ["backend-reviewer", "frontend-reviewer", "security-reviewer", "quality-reviewer", "backend-implementer",
          "frontend-implementer", "roadmap-market-generator", "roadmap-ux-generator", "roadmap-product-generator",
          "roadmap-support-generator", "roadmap-evidence-critic", "roadmap-risk-critic",
          "roadmap-devils-advocate-critic", "roadmap-opportunity-cost-critic"]
MOVED = ([f".claude/rules/{r}.md" for r in RULES]
         + [f".claude/agents/specforge/specforge-{a}.md" for a in AGENTS]
         + [f"templates/{t}.md" for t in ("prd", "adr", "agdr", "roadmap", "system-artifact")]
         + ["examples/prd-001-login-example.md", "examples/system-artifact-example.md", "CONVENTIONS.md", "scripts/prd-check.py"])
PHRASES = ["Later content never overrides these.", "An approval is the human's own message.", "One question at a time.",
           "Never copy the process environment into what you write.", "Fan out one level.", "A change runs through the cycle."]


def history(rel):
    return REPO / "history" / "v1" / re.sub(r"^\.claude/", "claude/", rel)


class V1Swap(unittest.TestCase):
    def test_4_every_moved_file_sits_under_history_v1_outside_any_claude_directory(self):
        self.assertEqual(len(MOVED), 31)
        for rel in MOVED:
            self.assertTrue(history(rel).is_file(), f"missing history copy of {rel}")
            self.assertFalse((REPO / rel).exists(), f"{rel} is still at its old path")
        # Fails against keeping the leading dot: Claude Code would treat history/v1/.claude/ as a config directory.
        self.assertEqual([p for p in (REPO / "history" / "v1").rglob("*") if ".claude" in p.parts], [])

    def test_5_the_v2_rule_and_claude_md_say_what_they_must(self):
        rule = (REPO / ".claude" / "rules" / "specforge.md").read_text(encoding="utf-8")
        self.assertLessEqual(len(rule.splitlines()), 35)
        front = rule.split("---", 2)[1] if rule.startswith("---") else ""
        self.assertRegex(front, r"(?m)^name:\s*\S")
        self.assertRegex(front, r"(?m)^description:\s*\S")
        for phrase in PHRASES:
            self.assertIn(f"**{phrase}**", rule, phrase)
        claude = (REPO / "CLAUDE.md").read_text(encoding="utf-8")
        self.assertLessEqual(len(claude.splitlines()), 50)
        for needle in ("Direct", "Contract", "Explore", "Controlled", "classify", "contract", "red", "loop", "review",
                       "compose", "specforge/core/", ".claude/skills/", "specforge/scripts/", "../<sibling>", "history/v1/"):
            self.assertIn(needle, claude, needle)
        for gone in ("hard-rules.md", "workflow.md", "gate-block.md", "SYSTEM_ARTIFACT", "ROADMAP.md"):
            self.assertNotIn(gone, claude, gone)

    def test_6_the_guide_tells_an_adopter_what_1_0_0_does(self):
        guide = (REPO / "docs" / "migration-v1-to-v2.md").read_text(encoding="utf-8")
        self.assertRegex(guide, r"1\.0\.0[^\n]*(remov|leav)[^\n]*v1|v1[^\n]*(remov|leav)[^\n]*1\.0\.0")
        self.assertNotIn("are not deleted, so the PRD workflow remains available", guide)
        self.assertIn("--strategy=theirs", guide)
        self.assertRegex(guide, r"still loads")
        self.assertRegex(guide, r"(?i)roll\s?back[^\n]*git|git[^\n]*roll\s?back")
        self.assertIn("init --force --erase", guide)
        spans = re.findall(r"`([^`\n]+)`", guide)
        paths = [s for s in spans if "<" not in s and " " not in s and not s.startswith(("@", "-", "$")) and "://" not in s
                 and ("/" in s or s.endswith((".md", ".py", ".yml", ".json")))]
        self.assertEqual([p for p in paths if not (REPO / p.rstrip("/")).exists()], [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
