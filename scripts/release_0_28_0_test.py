#!/usr/bin/env python3
"""Tests for specforge/changes/2026-10-26-release-0-28-0: the 0.28.0 release files.
One test per acceptance scenario, numbered the same way; scenario 5 lives in
scripts/migration_guide_test.py test 7.

    python3 scripts/release_0_28_0_test.py          # from the specforge directory
"""

import json
import re
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
CLI = REPO / "tools" / "cli"
SKILLS = ("specforge-classify", "specforge-loop", "specforge-review", "specforge-compose")


def entry():
    """The 0.28.0 entry: from its heading to the next `## [` heading."""
    text = (REPO / "CHANGELOG.md").read_text()
    at = text.find("## [0.28.0]")
    if at < 0:
        return ""
    nxt = text.find("\n## [", at + 1)
    return text[at:nxt if nxt > 0 else len(text)]


class Release0280Tests(unittest.TestCase):
    def test_1_every_version_field_reads_0_28_0(self):
        self.assertEqual((REPO / "VERSION").read_text().strip(), "0.28.0")
        self.assertEqual(json.loads((CLI / "package.json").read_text())["version"], "0.28.0")
        sw = json.loads((CLI / "npm-shrinkwrap.json").read_text())
        self.assertEqual((sw["version"], sw["packages"][""]["version"]), ("0.28.0", "0.28.0"))

    def test_2_the_first_changelog_heading_is_the_dated_0_28_0_entry(self):
        text = (REPO / "CHANGELOG.md").read_text()
        first = re.search(r"^## \[.*$", text, re.M)
        self.assertEqual(first.group(0).rstrip() if first else None, "## [0.28.0] - 2026-10-26")
        self.assertNotIn("## [Unreleased]", text)

    def test_3_the_entry_names_what_the_cli_now_installs(self):
        body = entry()
        for needle in ("specforge EVA", "specforge/core/", "specforge_lock_guard.py",
                       "lock-guard-registered", "docs/migration-v1-to-v2.md") + SKILLS:
            self.assertIn(needle, body, needle)

    def test_4_the_headless_blast_radius_is_breaking_and_names_classify(self):
        body = entry()
        self.assertIn("### Headless blast radius", body)
        part = body[body.find("### Headless blast radius"):]
        self.assertIn("**BREAKING for a headless installation**", part)
        self.assertIn("specforge-classify", part)
        self.assertNotRegex(part, r"\*\*No behaviour change for a headless installation")


if __name__ == "__main__":
    unittest.main(verbosity=2)
