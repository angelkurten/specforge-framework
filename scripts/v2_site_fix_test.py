#!/usr/bin/env python3
"""Fix round of specforge/changes/2026-11-02-v1-history-and-v2-site (review should-fixes
and nits): scenarios 6-10. The site's metadata says v2, the history README is honest
about its dangling links, the changelog's relative links resolve, and each concept page
states its rule as its source does.

    python3 scripts/v2_site_fix_test.py          # from the specforge directory
"""

import re
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DOCS = REPO / "docs"


def page(rel):
    return (DOCS / rel).read_text(encoding="utf-8")


class V2SiteFix(unittest.TestCase):
    def test_6_the_site_metadata_says_v2(self):
        meta = (REPO / "mkdocs.yml").read_text(encoding="utf-8")
        line = next((l for l in meta.splitlines() if l.startswith("site_description:")), "")
        self.assertTrue(line, "no site_description")
        # Fails against a description that still names the v1 documents.
        self.assertNotRegex(line, r"\bPRDs?\b|\bADRs?\b")
        self.assertRegex(line, r"(?i)contract|EVA")

    def test_7_the_history_readme_names_the_links_that_no_longer_resolve(self):
        readme = (REPO / "history" / "v1" / "README.md").read_text(encoding="utf-8")
        self.assertNotIn("still resolve together", readme)
        self.assertIn("SIBLINGS.md", readme)
        self.assertRegex(readme.lower(), r"no longer resolve|do not resolve|dangle")

    def test_8_every_relative_link_in_the_changelog_resolves(self):
        text = (REPO / "CHANGELOG.md").read_text(encoding="utf-8")
        broken = [t for t in re.findall(r"\]\(([^)#\s]+)(?:#[^)]*)?\)", text)
                  if "://" not in t and not t.startswith("mailto:") and not (REPO / t).exists()]
        # Fails against leaving links to the PRDs and ROADMAP.md this change moved.
        self.assertEqual(broken, [])

    def test_9_the_concept_pages_state_their_rules_as_the_sources_do(self):
        self.assertIn("review_prep.py", page("concepts/contract.md"))
        self.assertNotRegex(page("concepts/contract.md"), r"[Tt]he reviewer reports each")
        loop = page("concepts/loop.md")
        self.assertIn("nothing from the previous session", loop)
        self.assertNotIn("and nothing else", loop)
        review = page("concepts/review.md")
        for needle in ("Not checked", "`none", "CI"):
            self.assertIn(needle, review, needle)
        self.assertRegex(review.lower(), r"design mode[^\n]*optional|optional[^\n]*design mode")
        modes = page("concepts/modes.md")
        self.assertIn("one sentence", modes)
        self.assertIn("unsure", modes)
        self.assertRegex(page("faq.md").lower(), r"no input|none when")
        compose = page("concepts/compose.md")
        self.assertIn("AGENTS.md", compose)
        self.assertRegex(compose, r"80 lines")

    def test_10_quickstart_and_siblings_do_not_contradict_their_sources(self):
        quick = page("quickstart.md")
        self.assertNotIn("Each step has a skill", quick)
        sib = page("concepts/siblings.md")
        # The loop's agent loads the sibling's CLAUDE.md; an agent the lead dispatches is briefed with it.
        self.assertIn("CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD", sib)
        self.assertRegex(sib.lower(), r"dispatch")


if __name__ == "__main__":
    unittest.main(verbosity=2)
