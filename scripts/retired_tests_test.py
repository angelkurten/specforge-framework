#!/usr/bin/env python3
"""Tests for specforge/changes/2026-11-01-retired-tests: a contract's `## Retired tests`
section turns the deletions it declares, with a reason, into should-fix findings for the
human to confirm. One test per acceptance scenario, numbered the same way.

    python3 scripts/retired_tests_test.py          # from the specforge directory
"""

import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import review_test  # noqa: E402
import sibling_repos_test as sib  # noqa: E402

CHANGE = review_test.CHANGE
REPO = HERE.parent
DASH = " — "


def contract(*bullets):
    return "# Demo\n\n**Mode**: Contract\n\n## Retired tests\n\n" + "".join(f"- {b}\n" for b in bullets)


class Retired(review_test.Repo):
    def lines(self, r, severity):
        return [l for l in r.stdout.splitlines() if l.startswith(f"{severity}: ")]

    def test_1_a_declared_deleted_file_is_should_fix_and_an_undeclared_one_a_blocker(self):
        self.change({f"{CHANGE}/contract.md": contract(f"tests/other_test.py{DASH}pins the retired feature")},
                    deletes=["tests/other_test.py"])
        r = self.review()
        self.assertFalse(any("tests/other_test.py" in l for l in self.lines(r, "blocker")), r.stdout)
        hit = [l for l in self.lines(r, "should-fix") if "tests/other_test.py:1" in l and "retired by the contract" in l]
        self.assertEqual(len(hit), 1, r.stdout)
        self.assertIn("pins the retired feature", hit[0])
        # The same deletion, undeclared, stays a blocker.
        self.tearDown()
        self.setUp()
        self.change(deletes=["tests/other_test.py"])
        self.assertTrue(any("tests/other_test.py:1" in l and "test file deleted" in l for l in self.lines(self.review(), "blocker")))

    def test_2_a_declared_function_is_retired_and_an_undeclared_sibling_function_still_blocks(self):
        self.change({
            f"{CHANGE}/contract.md": contract(f"tests/app_test.py::test_empty{DASH}the empty case is gone"),
            "tests/app_test.py": "from src.app import total\n",
        })
        r = self.review()
        should = [l for l in self.lines(r, "should-fix") if "retired by the contract" in l]
        self.assertTrue(any("test_empty" in l for l in should), r.stdout)
        self.assertTrue(any("test_sum" in l and "removed" in l for l in self.lines(r, "blocker")), r.stdout)
        self.assertFalse(any("test_empty" in l for l in self.lines(r, "blocker")), r.stdout)
        # A whole-file entry covers every function removed from that file.
        self.tearDown()
        self.setUp()
        self.change({f"{CHANGE}/contract.md": contract(f"tests/app_test.py{DASH}the module is retired"),
                     "tests/app_test.py": "from src.app import total\n"})
        r = self.review()
        self.assertFalse(any("tests/app_test.py" in l for l in self.lines(r, "blocker")), r.stdout)

    def test_3_a_bullet_without_a_reason_retires_nothing(self):
        # Fails against matching the path alone.
        for bullet in ("tests/other_test.py", f"tests/other_test.py{DASH}", "tests/other_test.py — "):
            self.change({f"{CHANGE}/contract.md": contract(bullet)}, deletes=["tests/other_test.py"])
            r = self.review()
            self.assertTrue(any("tests/other_test.py:1" in l for l in self.lines(r, "blocker")), (bullet, r.stdout))
            self.tearDown()
            self.setUp()

    def test_4_a_declared_entry_the_range_does_not_delete_is_a_nit(self):
        self.change({f"{CHANGE}/contract.md": contract(f"tests/other_test.py{DASH}to be retired"),
                     "src/app.py": "def total(xs):\n    return sum(list(xs))\n"})
        r = self.review()
        self.assertTrue(any("retired test not deleted in the range" in l and "tests/other_test.py" in l
                            for l in self.lines(r, "nit")), r.stdout)


class RetiredSibling(sib.Siblings):
    test_1_the_packet_lists_sibling_files_and_names_both_ranges = None
    test_2_skip_and_stub_in_the_sibling_are_reported_at_their_lines = None
    test_3_a_deleted_sibling_test_file_or_function_is_a_blocker = None
    test_4_a_sibling_test_locked_by_another_change_is_should_fix = None
    test_5_the_flags_go_together_and_repo_must_be_a_git_repository = None

    def test_5_a_sibling_test_is_retired_as_the_packet_prints_it(self):
        (self.sf / sib.CHANGE / "contract.md").write_text(contract(f"../app/tests/app_test.py{DASH}moved to the sibling's own suite"))
        sib.git(self.sf, "commit", "-q", "-am", "retire")
        self.app_change(deletes=["tests/app_test.py"])
        r = self.review()
        self.assertFalse(any("../app/tests/app_test.py" in l and "test file deleted" in l for l in self.lines(r, "blocker")), r.stdout)
        self.assertTrue(any("../app/tests/app_test.py:1" in l and "retired by the contract" in l for l in self.lines(r, "should-fix")), r.stdout)


class Docs(unittest.TestCase):
    def test_6_the_template_and_review_md_name_the_section(self):
        self.assertIn("## Retired tests", (REPO / "templates" / "contract.md").read_text())
        self.assertIn("retired by the contract", (REPO / "specforge" / "core" / "review.md").read_text())


if __name__ == "__main__":
    unittest.main(verbosity=2)
