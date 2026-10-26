#!/usr/bin/env python3
"""Fix round for specforge/changes/2026-10-26-sibling-repos, raised by the lead before
review: loop.md told the agent to read the sibling with `git -C`, but its only agent
command allowed `git diff`, `git status` and `git log` in specforge alone, so a
`claude -p` iteration would be denied every sibling read.

    python3 scripts/sibling_repos_fix_test.py          # from the specforge directory
"""

import re
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent


class SiblingReposFixTests(unittest.TestCase):
    def test_10_loop_md_gives_a_sibling_agent_command_with_literal_git_reads(self):
        text = (REPO / "specforge" / "core" / "loop.md").read_text()
        m = re.search(r"^## Sibling repositories\s*$(.*?)(?=^## |\Z)", text, re.M | re.S)
        body = m.group(1) if m else ""
        command = next((l for l in body.splitlines() if "claude -p" in l), "")
        self.assertIn("env CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1 claude -p", command, body)
        self.assertIn("--add-dir ../<sibling>", command)
        for verb in ("diff", "status", "log"):
            self.assertIn(f"Bash(git -C ../<sibling> {verb} *)", command, verb)
        # Fails against `Bash(git -C * diff *)`, whose first `*` also matches
        # `-c core.fsmonitor=<program>` and so lets git run a program.
        self.assertNotRegex(body, r"Bash\(git -C \*")


if __name__ == "__main__":
    unittest.main(verbosity=2)
