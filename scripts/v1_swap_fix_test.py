#!/usr/bin/env python3
"""Fix round of specforge/changes/2026-11-01-v1-package-swap (review should-fixes):
scenarios 8-10. The guide tells a full rollback from a single-file restore and covers
every kind of edited v1 file; the shipped CLAUDE.md says where history/v1/ lives; the
one CLI source file the change edits carries no stale claim about workflow.md.

    python3 scripts/v1_swap_fix_test.py          # from the specforge directory
"""

import re
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent


def section(text, heading):
    m = re.search(rf"^## {re.escape(heading)}\s*$", text, re.M)
    if not m:
        return ""
    nxt = re.search(r"^## ", text[m.end():], re.M)
    return text[m.end():m.end() + nxt.start() if nxt else len(text)]


class V1SwapFix(unittest.TestCase):
    def test_8_the_guide_covers_every_edited_v1_file_and_both_rollbacks(self):
        part = section((REPO / "docs" / "migration-v1-to-v2.md").read_text(encoding="utf-8"), "Updating from 0.30.x")
        self.assertTrue(part.strip(), "no Updating from 0.30.x section")
        # Fails against presenting three outcomes as the whole set: an edited agent, template or example is kept too.
        self.assertNotIn("three outcomes", part)
        for kind in ("agent", "template", "example"):
            self.assertRegex(part.lower(), rf"\b{kind}", kind)
        self.assertRegex(part.lower(), r"dispatch")
        # Fails against "never touched again" without the full-rollback case: the restored manifest brings v1 back into the next update.
        self.assertRegex(part.lower(), r"full rollback")
        self.assertRegex(part.lower(), r"single file")
        self.assertRegex(part, r"every later `?update`?")
        self.assertRegex(part, r"@0\.30\.x")
        self.assertRegex(part, r"--erase[^\n]*(agent|template|example)")

    def test_9_claude_md_says_history_v1_is_in_the_source_repository(self):
        claude = (REPO / "CLAUDE.md").read_text(encoding="utf-8")
        line = next((l for l in claude.splitlines() if "history/v1/" in l), "")
        # Fails against pointing an adopter at a directory their install never has.
        self.assertRegex(line, r"source repository|specforge repository", line)

    def test_10_partition_ts_carries_no_stale_workflow_claim(self):
        src = (REPO / "tools" / "cli" / "src" / "partition.ts").read_text(encoding="utf-8")
        self.assertNotIn("which every `init` already writes", src)


if __name__ == "__main__":
    unittest.main(verbosity=2)
