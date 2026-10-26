#!/usr/bin/env python3
"""Second fix round for specforge/changes/2026-10-26-sibling-repos, from the review's
should-fix findings on review_prep.py's --repo path (PASS, 2026-10-26).

    python3 scripts/sibling_repos_fix2_test.py          # from the specforge directory

Reuses the two-repository fixture of scripts/sibling_repos_test.py.
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import sibling_repos_test as base  # noqa: E402

APP_TEST, git = base.APP_TEST, base.git


class SiblingReposFix2Tests(base.Siblings):
    # The fixture's own scenarios run in sibling_repos_test.py, not again here.
    test_1_the_packet_lists_sibling_files_and_names_both_ranges = None
    test_2_skip_and_stub_in_the_sibling_are_reported_at_their_lines = None
    test_3_a_deleted_sibling_test_file_or_function_is_a_blocker = None
    test_4_a_sibling_test_locked_by_another_change_is_should_fix = None
    test_5_the_flags_go_together_and_repo_must_be_a_git_repository = None

    def test_11_an_absolute_repo_path_still_matches_lock_entries(self):
        # Fails against prefixing paths with the raw --repo string: lock entries say ../app/.
        self.app_change({"tests/app_test.py": APP_TEST.replace("== 3", "== 4")})
        r = self.review("--repo", str(self.app), "--repo-base", self.app_base)
        self.assertIn("- M ../app/tests/app_test.py", r.stdout)
        self.assertTrue(any("../app/tests/app_test.py" in l and "2026-10-01-other" in l
                            for l in self.lines(r, "should-fix")), r.stdout)

    def test_12_a_subdirectory_or_a_bad_ref_never_crashes(self):
        self.app_change({"src/app.py": "def total(xs):\n    return sum(list(xs))\n"})
        r = self.review("--repo", "../app/tests", "--repo-base", self.app_base)
        self.assertNotIn("Traceback", r.stderr)
        self.assertIn("- M ../app/src/app.py", r.stdout)
        r = self.review("--repo", "../app", "--repo-base", "no-such-ref")
        self.assertEqual(r.returncode, 2, r.stderr[-300:])
        self.assertIn("no-such-ref", r.stderr)
        self.assertNotIn("Traceback", r.stderr)

    def test_13_an_empty_sibling_range_is_a_blocker(self):
        # Fails against checking only specforge's range for emptiness.
        head = git(self.app, "rev-parse", "HEAD").strip()
        r = self.review("--repo", "../app", "--repo-base", head)
        self.assertEqual(r.returncode, 1, r.stdout)
        self.assertTrue(any("../app" in l and "empty" in l for l in self.lines(r, "blocker")), r.stdout)

    def test_14_the_packet_tells_the_reviewer_to_read_the_sibling_diff(self):
        self.app_change({"src/app.py": "def total(xs):\n    return sum(list(xs))\n"})
        r = self.review()
        tail = r.stdout.split("## For the reviewer", 1)[-1]
        self.assertIn(f"git -C ../app diff {self.app_base}...HEAD", tail)


if __name__ == "__main__":
    unittest.main(verbosity=2)
