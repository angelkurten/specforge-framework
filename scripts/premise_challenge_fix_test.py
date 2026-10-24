#!/usr/bin/env python3
"""Tests for the review findings on the premise challenge.

    python3 scripts/premise_challenge_fix_test.py          # from the specforge directory

Scenarios 8-12 of specforge/changes/2026-10-24-premise-challenge/contract.md,
added after the first review. Reuses the loop fixture from
scripts/premise_challenge_test.py, which is locked.
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import premise_challenge_test as base  # noqa: E402
from archive_test import Repo  # noqa: E402

HEAD, TEMPLATE = base.HEAD, base.TEMPLATE

TAIL = "\n## Acceptance evidence\n\n1. It works.\n"
HOLDS = "## Premises\n\n- The fixture repo exists — `git status` → holds\n"
MENTION = "## Scope\n\n- A `## Premises` section in the template.\n- A phase before Red.\n\n"


class PremiseChallengeFixTests(Repo):
    # The loop helpers only; subclassing the locked suite would re-run its tests.
    run_loop = base.PremiseChallengeTests.run_loop
    assertRefused = base.PremiseChallengeTests.assertRefused
    def test_8_a_mention_before_the_heading_does_not_hide_the_real_premises(self):
        # Fails against a parser that takes the first `## Premises` anywhere in
        # the file: it would read the Scope bullets as unchecked premises.
        r = self.run_loop(HEAD + MENTION + HOLDS + TAIL)
        self.assertTrue(self.marker.exists(), r.stdout + r.stderr)
        self.assertEqual(r.returncode, 3, r.stdout + r.stderr)

    def test_9_a_mention_without_the_heading_does_not_start(self):
        r = self.run_loop(HEAD + MENTION + TAIL)
        self.assertRefused(r)
        self.assertIn("Premises", r.stdout + r.stderr)

    def test_10_a_heading_with_no_bullet_does_not_start(self):
        # What a contract copied from the template looks like when nobody filled it in.
        section = TEMPLATE.read_text().split("## Premises", 1)[1].split("\n## ", 1)[0]
        r = self.run_loop(HEAD + "## Premises" + section + TAIL)
        self.assertRefused(r)
        self.assertIn("Premises", r.stdout + r.stderr)

    def test_11_only_none_with_a_reason_counts_as_no_premise(self):
        for bullet in (
            "- nonexistent tenants never share the cache — `grep -rn cache src/`",
            "- none",
            "- none —",
        ):
            with self.subTest(bullet=bullet):
                r = self.run_loop(HEAD + "## Premises\n\n" + bullet + "\n" + TAIL)
                self.assertRefused(r)

    def test_12_the_template_says_a_premise_fits_on_one_line(self):
        section = TEMPLATE.read_text().split("## Premises", 1)[1].split("\n## ", 1)[0]
        self.assertIn("one line", section)


if __name__ == "__main__":
    unittest.main()
