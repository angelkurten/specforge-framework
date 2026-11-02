#!/usr/bin/env python3
"""Fix round of specforge/changes/2026-11-02-v1-out-of-the-cli (review BLOCK): scenario 9.
The guide's pre-0.11 line names the agents directory stale-briefings warns about, at the
project root, and never the v2 reviewer's .claude/agents.

    python3 scripts/v1_cli_fix_test.py          # from the specforge directory
"""

import re
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent


class V1CliFix(unittest.TestCase):
    def test_9_the_pre_0_11_line_names_the_root_agents_directory(self):
        guide = (REPO / "docs" / "migration-v1-to-v2.md").read_text(encoding="utf-8")
        lines = [l for l in guide.splitlines() if "0.11" in l and "agents" in l]
        self.assertTrue(lines, "no guide line names 0.11 and agents")
        for line in lines:
            # Fails against the shipped line, which sends the adopter to .claude/agents, where the v2 reviewer lives.
            self.assertNotIn(".claude/agents", line)
            self.assertRegex(line, r"(?<![\w./])agents/")
            self.assertRegex(line, r"(?i)\broot\b")


if __name__ == "__main__":
    unittest.main(verbosity=2)
