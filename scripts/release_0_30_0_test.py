#!/usr/bin/env python3
"""Tests for specforge/changes/2026-10-29-release-0-30-0. One test per acceptance
scenario, numbered the same way. Written to survive later releases: version fields
are compared with VERSION, and the 0.30.0 entry is found by its own heading.

    python3 scripts/release_0_30_0_test.py          # from the specforge directory
"""

import json
import re
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
CLI = REPO / "tools" / "cli"


def entry():
    """The 0.30.0 entry: from its heading to the next `## [` heading."""
    text = (REPO / "CHANGELOG.md").read_text()
    m = re.search(r"^## \[0\.30\.0\].*$", text, re.M)
    if not m:
        return "", ""
    nxt = text.find("\n## [", m.end())
    return m.group(0), text[m.start():nxt if nxt > 0 else len(text)]


class Release0300Tests(unittest.TestCase):
    def test_1_version_is_at_least_0_30_0_and_every_field_agrees(self):
        version = (REPO / "VERSION").read_text().strip()
        self.assertGreaterEqual(tuple(map(int, version.split("."))), (0, 30, 0), version)
        self.assertEqual(json.loads((CLI / "package.json").read_text())["version"], version)
        sw = json.loads((CLI / "npm-shrinkwrap.json").read_text())
        self.assertEqual((sw["version"], sw["packages"][""]["version"]), (version, version))

    def test_2_the_0_30_0_entry_is_dated_and_names_what_ships(self):
        heading, body = entry()
        self.assertEqual(heading.rstrip(), "## [0.30.0] - 2026-10-29")
        for needle in ("review_prep.py", "Exercised", "evidence-report.md", "review.md",
                       "specforge-reviewer.md", "SYSTEM_ARTIFACT.md"):
            self.assertIn(needle, body, needle)

    def test_3_the_headless_blast_radius_is_breaking_and_names_the_verdict_change(self):
        _, body = entry()
        part = body[body.find("### Headless blast radius"):] if "### Headless blast radius" in body else ""
        self.assertIn("**BREAKING for a headless installation**", part)
        self.assertIn("Exercised", part)
        self.assertIn("BLOCK", part)
        self.assertRegex(part, r"[Nn]o (script's )?exit code")

    def test_4_v2_ci_runs_this_test_and_keeps_the_0_29_0_one(self):
        ci = (REPO / ".github" / "workflows" / "v2-ci.yml").read_text()
        self.assertRegex(ci, r"\brelease_0_30_0_test\b")
        self.assertRegex(ci, r"\brelease_0_29_0_test\b")


if __name__ == "__main__":
    unittest.main(verbosity=2)
