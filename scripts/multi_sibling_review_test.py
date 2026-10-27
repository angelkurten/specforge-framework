#!/usr/bin/env python3
"""Tests for specforge/changes/2026-10-27-multi-sibling-review: review_prep.py takes
several code siblings, --repo and --repo-base paired in order. One test per
acceptance scenario, numbered the same way.

    python3 scripts/multi_sibling_review_test.py          # from the specforge directory

Extends the two-repository fixture of scripts/sibling_repos_test.py with a second
sibling, web/.
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import sibling_repos_test as base  # noqa: E402

WEB_TEST = "test('renders', () => {\n  if (1 + 1 !== 2) throw new Error('math')\n})\n"


class TwoSiblings(base.Siblings):
    # The fixture's own scenarios run in sibling_repos_test.py, not again here.
    test_1_the_packet_lists_sibling_files_and_names_both_ranges = None
    test_2_skip_and_stub_in_the_sibling_are_reported_at_their_lines = None
    test_3_a_deleted_sibling_test_file_or_function_is_a_blocker = None
    test_4_a_sibling_test_locked_by_another_change_is_should_fix = None
    test_5_the_flags_go_together_and_repo_must_be_a_git_repository = None

    def setUp(self):
        super().setUp()
        self.web = self.sf.parent / "web"
        self.web_base = base.init(self.web, {"src/team.js": "export const team = () => ''\n", "tests/team.test.js": WEB_TEST})

    def web_change(self, edits):
        for rel, text in edits.items():
            (self.web / rel).write_text(text)
        base.git(self.web, "add", "-A")
        base.git(self.web, "commit", "-q", "-m", "change")

    def both(self, web="../web", web_base=None):
        return ["--repo", "../app", "--repo-base", self.app_base, "--repo", web, "--repo-base", web_base or self.web_base]

    def test_1_both_siblings_are_listed_and_named(self):
        self.app_change({"src/app.py": "def total(xs):\n    return sum(list(xs))\n"})
        self.web_change({"src/team.js": "export const team = (t) => t.name\n"})
        r = self.review(*self.both())
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn("- M ../app/src/app.py", r.stdout)
        self.assertIn("- M ../web/src/team.js", r.stdout)
        rng = next(l for l in r.stdout.splitlines() if l.startswith("Range:"))
        self.assertIn(f"../app {self.app_base}...HEAD", rng)
        self.assertIn(f"../web {self.web_base}...HEAD", rng)
        tail = r.stdout.split("## For the reviewer", 1)[-1]
        self.assertIn(f"git -C ../app diff {self.app_base}...HEAD", tail)
        self.assertIn(f"git -C ../web diff {self.web_base}...HEAD", tail)

    def test_2_the_second_sibling_gets_every_check(self):
        self.app_change({"src/app.py": "def total(xs):\n    return sum(list(xs))\n"})
        self.web_change({"tests/team.test.js": "test.skip('later', () => {})\n" + WEB_TEST})
        r = self.review(*self.both())
        # Fails against keeping only the last --repo: the first sibling must still be listed.
        self.assertIn("- M ../app/src/app.py", r.stdout)
        self.assertTrue(any("../web/tests/team.test.js:1" in l for l in self.lines(r, "blocker")), r.stdout)
        # Fails against checking only the first sibling's range for emptiness.
        head = base.git(self.web, "rev-parse", "HEAD").strip()
        r = self.review(*self.both(web_base=head))
        self.assertTrue(any(l.startswith("blocker: ../web") and "empty" in l for l in self.lines(r, "blocker")), r.stdout)

    def test_3_unequal_pairs_are_a_usage_error(self):
        for extra in (["--repo", "../app", "--repo", "../web", "--repo-base", self.app_base],
                      ["--repo", "../app", "--repo-base", self.app_base, "--repo-base", self.web_base]):
            r = self.review(*extra)
            self.assertEqual(r.returncode, 2, extra)
            self.assertNotIn("unrecognized arguments", r.stderr)
            # Fails against argparse keeping the last value of each flag.
            self.assertRegex(r.stderr, r"pair")
            self.assertNotIn("Traceback", r.stderr)

    def test_4_the_same_sibling_twice_is_a_usage_error(self):
        r = self.review("--repo", "../app", "--repo-base", self.app_base,
                        "--repo", str(self.app), "--repo-base", self.app_base)
        self.assertEqual(r.returncode, 2, r.stdout)
        self.assertIn("../app", r.stderr)
        self.assertRegex(r.stderr, r"twice|duplicate|more than once")

    def test_5_a_bad_second_ref_names_its_sibling_and_a_symlink_normalizes(self):
        r = self.review(*self.both(web_base="no-such-ref"))
        self.assertEqual(r.returncode, 2)
        self.assertIn("no-such-ref", r.stderr)
        self.assertIn("../web", r.stderr)
        self.assertNotIn("Traceback", r.stderr)
        # Fails against keeping only the last pair: a bad ref in the first is ignored then.
        r = self.review("--repo", "../app", "--repo-base", "no-such-ref", "--repo", "../web", "--repo-base", self.web_base)
        self.assertEqual(r.returncode, 2, r.stdout)
        self.assertIn("../app", r.stderr)
        (self.sf.parent / "weblink").symlink_to(self.web)
        self.app_change({"src/app.py": "def total(xs):\n    return sum(list(xs))\n"})
        self.web_change({"src/team.js": "export const team = (t) => t.name\n"})
        r = self.review(*self.both(web="../weblink"))
        self.assertIn("- M ../web/src/team.js", r.stdout)
        self.assertIn("- M ../app/src/app.py", r.stdout)


if __name__ == "__main__":
    unittest.main(verbosity=2)
