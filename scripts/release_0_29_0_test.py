#!/usr/bin/env python3
"""Tests for specforge/changes/2026-10-29-release-0-29-0. One test per acceptance
scenario, numbered the same way. Written to survive later releases: version fields
are compared with VERSION, and the 0.29.0 entry is found by its own heading.

    python3 scripts/release_0_29_0_test.py          # from the specforge directory
"""

import json
import re
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
CLI = REPO / "tools" / "cli"


def entry():
    """The 0.29.0 entry: from its heading to the next `## [` heading."""
    text = (REPO / "CHANGELOG.md").read_text()
    m = re.search(r"^## \[0\.29\.0\].*$", text, re.M)
    if not m:
        return "", ""
    nxt = text.find("\n## [", m.end())
    return m.group(0), text[m.start():nxt if nxt > 0 else len(text)]


class Release0290Tests(unittest.TestCase):
    def test_1_version_is_at_least_0_29_0_and_every_field_agrees(self):
        version = (REPO / "VERSION").read_text().strip()
        self.assertGreaterEqual(tuple(map(int, version.split("."))), (0, 29, 0), version)
        self.assertEqual(json.loads((CLI / "package.json").read_text())["version"], version)
        sw = json.loads((CLI / "npm-shrinkwrap.json").read_text())
        self.assertEqual((sw["version"], sw["packages"][""]["version"]), (version, version))

    def test_2_the_0_29_0_entry_is_dated_and_names_what_ships(self):
        heading, body = entry()
        self.assertEqual(heading.rstrip(), "## [0.29.0] - 2026-10-29")
        for needle in ("--repo", "--repo-base", "compose_check.py", "archive.py",
                       "specforge_lock_guard.py", "loop.md", "SYSTEM_ARTIFACT.md"):
            self.assertIn(needle, body, needle)

    def test_3_the_headless_blast_radius_is_breaking_and_names_both_refusals(self):
        _, body = entry()
        part = body[body.find("### Headless blast radius"):] if "### Headless blast radius" in body else ""
        self.assertIn("**BREAKING for a headless installation**", part)
        self.assertRegex(part, r"exit(s)? 2|exit code 2")
        self.assertIn("archive.py", part)
        self.assertIn("compose", part)

    def test_4_v2_ci_runs_this_test_and_retires_the_0_28_0_one(self):
        ci = (REPO / ".github" / "workflows" / "v2-ci.yml").read_text()
        self.assertRegex(ci, r"\brelease_0_29_0_test\b")
        self.assertNotRegex(ci, r"\brelease_0_28_0_test\b")


if __name__ == "__main__":
    unittest.main(verbosity=2)
