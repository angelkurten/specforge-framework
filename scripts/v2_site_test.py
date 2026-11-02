#!/usr/bin/env python3
"""Tests for specforge/changes/2026-11-02-v1-history-and-v2-site: scenarios 1-5, numbered
the same way. The rest of the v1 history sits under history/v1/, and the docs site
explains v2 with no v1 vocabulary outside the migration guide.

    python3 scripts/v2_site_test.py          # from the specforge directory
"""

import re
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DOCS = REPO / "docs"
PRDS = sorted(p.name for p in (REPO / "history" / "v1").glob("0[0-9][0-9]-*.md")) if (REPO / "history" / "v1").is_dir() else []
MOVED = ["ADR-001-determinist-index-for-frozen-corpus.md", "AgDR-001-vitest-as-cli-test-runner.md", "ROADMAP.md",
         "tests/README.md", "tests/roadmap", "tests/sdd-2026", "tests/workflow",
         "docs/index.md", "docs/quickstart.md", "docs/faq.md", "docs/concepts/mental-model.md",
         "docs/concepts/siblings.md", "docs/concepts/roadmap.md", "docs/workflow/overview.md"]
# v1 pages a v2 page replaces at the same path: the v1 copy moves, a different page stays.
REPLACED = ["docs/index.md", "docs/quickstart.md", "docs/faq.md", "docs/concepts/siblings.md"]
NAV = ["index.md", "quickstart.md", "concepts/modes.md", "concepts/contract.md", "concepts/loop.md",
       "concepts/review.md", "concepts/compose.md", "concepts/siblings.md", "migration-v1-to-v2.md", "faq.md"]
V1_WORDS = [r"\bPRDs?\b", r"\bADRs?\b", r"gate block", r"SYSTEM_ARTIFACT", r"ROADMAP", r"hard rules?", r"reviewer panel", r"workflow\.md"]
SOURCES = {
    "modes.md": ["specforge/core/modes.md", "specforge-classify"],
    "contract.md": ["templates/contract.md", "Premises", "Acceptance evidence", "## Retired tests"],
    "loop.md": ["specforge/core/loop.md", "specforge-loop", "locked"],
    "review.md": ["specforge/core/review.md", "specforge-review", "Exercised", "design mode"],
    "compose.md": ["specforge/core/compose.md", "specforge-compose"],
    "siblings.md": ["../<sibling>", "--add-dir", "--repo"],
}


def nav_files():
    text = (REPO / "mkdocs.yml").read_text(encoding="utf-8")
    block = text.split("nav:", 1)[1].split("\n\n", 1)[0]
    return re.findall(r":\s*([\w./-]+\.md)\s*$", block, re.M)


class V2Site(unittest.TestCase):
    def test_1_the_v1_history_sits_under_history_v1(self):
        # Fails against leaving the frozen PRDs at the root.
        self.assertEqual(len(PRDS), 19, PRDS)
        self.assertEqual(sorted(p.name for p in REPO.glob("0[0-9][0-9]-*.md")), [])
        for rel in MOVED:
            self.assertTrue((REPO / "history" / "v1" / rel).exists(), f"missing history/v1/{rel}")
            if rel in REPLACED:
                # Fails against leaving the v1 page in place: the page at the old path must be a new one.
                self.assertNotEqual((REPO / rel).read_bytes(), (REPO / "history" / "v1" / rel).read_bytes(), rel)
            else:
                self.assertFalse((REPO / rel).exists(), f"{rel} is still at its old path")
        readme = (REPO / "history" / "v1" / "README.md").read_text(encoding="utf-8").lower()
        self.assertRegex(readme, r"not loaded")
        self.assertRegex(readme, r"not shipped")
        self.assertTrue((REPO / "SIBLINGS.md").is_file(), "SIBLINGS.md stays until change 4")
        self.assertTrue((REPO / "tests" / "v2").is_dir())

    def test_2_the_nav_lists_exactly_the_v2_pages(self):
        self.assertEqual(nav_files(), NAV)
        for rel in NAV:
            self.assertTrue((DOCS / rel).is_file(), rel)
        orphans = [p.relative_to(DOCS).as_posix() for p in DOCS.rglob("*.md")
                   if p.relative_to(DOCS).as_posix() not in NAV]
        self.assertEqual(orphans, [])

    def test_3_no_v1_vocabulary_outside_the_migration_guide(self):
        hits = []
        for rel in NAV:
            if rel == "migration-v1-to-v2.md":
                continue
            text = (DOCS / rel).read_text(encoding="utf-8")
            hits += [f"{rel}: {w}" for w in V1_WORDS if re.search(w, text)]
        self.assertEqual(hits, [])

    def test_4_each_page_names_its_source_of_truth(self):
        for page, needles in SOURCES.items():
            text = (DOCS / "concepts" / page).read_text(encoding="utf-8")
            for needle in needles:
                self.assertIn(needle, text, f"{page}: {needle}")
        quick = (DOCS / "quickstart.md").read_text(encoding="utf-8")
        steps = [quick.lower().find(s) for s in ("classify", "contract", "red", "loop", "review", "compose")]
        self.assertTrue(all(i >= 0 for i in steps) and steps == sorted(steps), steps)
        for needle in ("specforge-classify", "specforge-loop", "specforge-review", "specforge-compose",
                       "lock_tests.py", "loop.py", "review_prep.py", "compose_check.py", "archive.py"):
            self.assertIn(needle, quick, needle)
        index = (DOCS / "index.md").read_text(encoding="utf-8")
        for needle in ("specforge EVA", "Direct", "Contract", "Explore", "Controlled", "npx @angelkurten/specforge init"):
            self.assertIn(needle, index, needle)

    def test_5_every_relative_link_under_docs_resolves(self):
        broken = []
        for page in DOCS.rglob("*.md"):
            for target in re.findall(r"\]\(([^)#\s]+)(?:#[^)]*)?\)", page.read_text(encoding="utf-8")):
                if "://" in target or target.startswith("mailto:"):
                    continue
                if not (page.parent / target).resolve().exists():
                    broken.append(f"{page.relative_to(DOCS)} -> {target}")
        self.assertEqual(broken, [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
