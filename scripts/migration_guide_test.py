#!/usr/bin/env python3
"""Tests for specforge/changes/2026-10-25-migration-guide: the v1 to specforge EVA
migration guide, and the README, mkdocs and CHANGELOG pointers to it. One test per
acceptance scenario, numbered the same way.

    python3 scripts/migration_guide_test.py          # from the specforge directory
"""

import re
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
GUIDE = REPO / "docs" / "migration-v1-to-v2.md"
SECTIONS = ["What changes", "What stays", "Upgrade", "In-flight PRDs",
            "v1 to v2 map", "Your first change", "Known limits"]


def sections(text):
    """{heading: body} for every `## ` heading."""
    out, name = {}, None
    for line in text.splitlines():
        if line.startswith("## "):
            name = line[3:].strip()
            out[name] = ""
        elif name is not None:
            out[name] += line + "\n"
    return out


def guide():
    return GUIDE.read_text() if GUIDE.exists() else ""


class MigrationGuideTests(unittest.TestCase):
    def test_1_the_guide_has_its_seven_sections_in_order_and_expands_eva(self):
        text = guide()
        self.assertTrue(text, GUIDE)
        heads = [h for h in sections(text) if h in SECTIONS]
        self.assertEqual(heads, SECTIONS)
        self.assertRegex(text, r"Evidence,\s+Verification,\s+Adaptation")

    def test_2_every_repository_path_the_guide_names_exists(self):
        spans = re.findall(r"`([^`\n]+)`", guide())
        paths = [s for s in spans
                 if "<" not in s and " " not in s and not s.startswith(("@", "-", "$"))
                 and "://" not in s
                 and ("/" in s or s.endswith((".md", ".py", ".yml", ".json")))]
        self.assertGreaterEqual(len(set(paths)), 8, paths)
        missing = [p for p in paths if not (REPO / p.rstrip("/")).exists()]
        self.assertEqual(missing, [])

    def test_3_upgrade_carries_the_hook_block_and_doctor(self):
        body = sections(guide()).get("Upgrade", "")
        self.assertIn('"PreToolUse"', body)
        self.assertIn(".claude/hooks/specforge_lock_guard.py", body)
        self.assertRegex(body, r"specforge doctor")

    def test_4_in_flight_drafts_finish_under_v1_and_implemented_prds_stay(self):
        body = sections(guide()).get("In-flight PRDs", "")
        self.assertRegex(body, r"`Draft`[^\n]*(finish|complete)[^\n]*v1|v1[^\n]*(finish|complete)[^\n]*`Draft`")
        self.assertRegex(body, r"`Implemented`[^\n]*(not|never)[^\n]*convert")

    def test_5_mkdocs_nav_lists_the_guide(self):
        nav = (REPO / "mkdocs.yml").read_text().split("nav:", 1)[1].split("\n\n", 1)[0]
        self.assertIn("migration-v1-to-v2.md", nav)

    def test_6_both_readmes_name_eva_and_link_the_guide_from_upgrading(self):
        for name, head in (("README.md", "Upgrading"), ("README.es.md", "Actualización (upgrade)")):
            body = sections((REPO / name).read_text()).get(head, "")
            self.assertIn("specforge EVA", body, name)
            # README files ship to adopters without docs/ (PRD-005 § 9 row 14), so they
            # link the published page, never the repository path.
            self.assertIn("https://angelkurten.github.io/specforge-framework/migration-v1-to-v2/", body, name)
            self.assertNotIn("](docs/", (REPO / name).read_text(), name)

    def test_7_changelog_has_an_unreleased_eva_section_first(self):
        text = (REPO / "CHANGELOG.md").read_text()
        self.assertIn("## [Unreleased]", text)
        self.assertLess(text.index("## [Unreleased]"), text.index("## [0.27.3]"))
        part = text[text.index("## [Unreleased]"):text.index("## [0.27.3]")]
        self.assertIn("specforge EVA", part)
        self.assertIn("docs/migration-v1-to-v2.md", part)


if __name__ == "__main__":
    unittest.main(verbosity=2)
