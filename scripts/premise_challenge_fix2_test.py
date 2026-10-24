#!/usr/bin/env python3
"""Tests for the second review's findings on the premise challenge.

    python3 scripts/premise_challenge_fix2_test.py          # from the specforge directory

Scenarios 13-18 of specforge/changes/2026-10-24-premise-challenge/contract.md,
added after the second review. Reuses the loop fixture from
scripts/premise_challenge_test.py, which is locked.
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import premise_challenge_test as base  # noqa: E402
from archive_test import LOOP, Repo  # noqa: E402

HEAD, TEMPLATE = base.HEAD, base.TEMPLATE
TAIL = "\n## Acceptance evidence\n\n1. It works.\n"
GOOD = "- The fixture repo exists — `git status` → holds"


def premises(*bullets):
    return HEAD + "## Premises\n\n" + "\n".join(bullets) + "\n" + TAIL


class PremiseChallengeFix2Tests(Repo):
    # The loop helpers only; subclassing the locked suite would re-run its tests.
    assertRefused = base.PremiseChallengeTests.assertRefused

    def run_loop(self, contract, **kw):
        # Subtests share the marker file; a stale one from an earlier subtest
        # would make a refusal look like a run.
        (self.root / "agent-ran").unlink(missing_ok=True)
        return base.PremiseChallengeTests.run_loop(self, contract, **kw)

    def assertStarts(self, r):
        self.assertTrue(self.marker.exists(), r.stdout + r.stderr)
        self.assertEqual(r.returncode, 3, r.stdout + r.stderr)
        self.marker.unlink()

    def test_13_a_result_needs_a_backticked_command_right_before_it(self):
        for bullet in (
            "- The cache is per-tenant → holds",
            "- The cache is per-tenant — `grep -rn cache src/` and a look at the config → holds",
            "- The cache is per-tenant — `grep -rn cache src/` → holds? not run yet",
            "- The cache is per-tenant — `` → holds",
            "- The cache is per-tenant — `grep -rn cache src/` → fails:",
        ):
            with self.subTest(bullet=bullet):
                self.assertRefused(self.run_loop(premises(GOOD, bullet)))

    def test_14_the_documented_forms_start_the_loop(self):
        # Fails against an implementation that tightened the format past the
        # template: a result may carry a detail after `:` or `.`.
        for bullet in (
            GOOD,
            "- The fixture repo exists — `git status` → holds: clean tree",
            "- The fixture repo exists — `git status` → holds. Checked twice.",
        ):
            with self.subTest(bullet=bullet):
                self.assertStarts(self.run_loop(premises(bullet)))

    def test_15_a_bullet_in_another_shape_does_not_slip_past(self):
        for bullet in ("* The cache is per-tenant", "  - The cache is per-tenant", "+ The cache is per-tenant"):
            with self.subTest(bullet=bullet):
                r = self.run_loop(premises(GOOD, bullet))
                self.assertRefused(r)
                self.assertIn("The cache is per-tenant", r.stdout + r.stderr)

    def test_16_the_template_comment_is_not_read_as_premises(self):
        # The template's comment holds indented example bullets; a contract that
        # keeps it and adds one checked premise must start.
        section = TEMPLATE.read_text().split("## Premises", 1)[1].split("\n## ", 1)[0]
        self.assertIn("  - ", section)
        self.assertStarts(self.run_loop(HEAD + "## Premises" + section + "\n" + GOOD + "\n" + TAIL))

    def test_17_a_failing_agent_with_no_stderr_prints_no_blank_line(self):
        r = self.run_loop(premises(GOOD), agent_body="sys.exit(1)\n")
        self.assertEqual(r.stderr, "", repr(r.stderr))

    def test_18_the_docstring_names_the_premise_refusal(self):
        doc = LOOP.read_text().split('"""', 2)[1]
        self.assertIn("Premises", doc)


if __name__ == "__main__":
    unittest.main()
