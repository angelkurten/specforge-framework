#!/usr/bin/env python3
"""Fix round for specforge/changes/2026-10-25-migration-guide, raised by the lead
before review: placeholder sections, a CLI command that does not exist, and the
contract's constraints the first tests did not check.

    python3 scripts/migration_guide_fix_test.py          # from the specforge directory
"""

import re
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
GUIDE = REPO / "docs" / "migration-v1-to-v2.md"


def sections(text):
    out, name = {}, None
    for line in text.splitlines():
        if line.startswith("## "):
            name = line[3:].strip()
            out[name] = ""
        elif name is not None:
            out[name] += line + "\n"
    return out


class MigrationGuideFixTests(unittest.TestCase):
    def test_8_no_section_is_a_placeholder(self):
        # Fails against the loop's first draft, whose last two sections said
        # "Details are filled in by the tasks that follow".
        for name, body in sections(GUIDE.read_text()).items():
            self.assertNotRegex(body.lower(), r"filled in by|tbd|todo|placeholder", name)
            self.assertGreaterEqual(len(body.split()), 40, name)

    def test_9_first_change_walks_the_cycle_in_order(self):
        body = sections(GUIDE.read_text()).get("Your first change", "")
        steps = ["specforge-classify", "contract.md", "lock_tests.py approve",
                 "loop.py", "specforge-review", "specforge-compose", "archive.py"]
        at = [body.find(s) for s in steps]
        self.assertNotIn(-1, at, dict(zip(steps, at)))
        self.assertEqual(at, sorted(at), dict(zip(steps, at)))

    def test_10_known_limits_names_what_is_still_open(self):
        body = sections(GUIDE.read_text()).get("Known limits", "")
        self.assertIn("2026-11-08", body)
        self.assertIn("not a sandbox", body)
        self.assertIn("`.claude/`", body)

    def test_11_cli_commands_are_written_as_npx(self):
        # Fails against `specforge update`, a binary the package does not install globally.
        text = GUIDE.read_text()
        self.assertIn("npx @angelkurten/specforge update", text)
        self.assertIn("npx @angelkurten/specforge doctor", text)
        bare = re.findall(r"(?<!@angelkurten/)\bspecforge (?:update|doctor|init)\b", text)
        self.assertEqual(bare, [])

    def test_12_the_guide_quotes_the_pilot_and_names_direct_and_the_design_panel(self):
        text = GUIDE.read_text()
        for figure in ("10", "25", "6.1", "3.3"):
            self.assertRegex(text, rf"(?<![\d.]){re.escape(figure)}(?![\d.])", figure)
        self.assertIn("Direct", text)
        self.assertRegex(text, r"edge test")
        self.assertRegex(text, r"[Dd]esign panel")


if __name__ == "__main__":
    unittest.main(verbosity=2)
