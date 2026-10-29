#!/usr/bin/env python3
"""Tests for specforge/changes/2026-10-29-review-prep-lock-and-ci: review_prep.py
reports a lock entry added after its first approval, and a CI field that names
commits but not the range's last code commit. One test per acceptance scenario,
numbered the same way.

    python3 scripts/review_prep_lock_ci_test.py          # from the specforge directory
"""

import subprocess
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import review_test  # noqa: E402
import sibling_repos_test  # noqa: E402

LOCK = HERE.parent / "specforge" / "scripts" / "lock_tests.py"
CHANGE = review_test.CHANGE


def evidence(ci):
    return review_test.EVIDENCE.replace("- **CI**: v2-ci run 1, green", f"- **CI**: {ci}")


class Base(review_test.Repo):
    def commit(self, msg="c"):
        self.git("add", "-A")
        self.git("commit", "-q", "-m", msg)
        return self.git("rev-parse", "HEAD").strip()

    def approve(self, *paths):
        subprocess.run([sys.executable, str(LOCK), "approve", CHANGE, *paths], cwd=self.root, check=True,
                       capture_output=True)

    def lines(self, r, severity):
        return [l for l in r.stdout.splitlines() if l.startswith(f"{severity}: ")]

    def added(self, r):
        return [l for l in self.lines(r, "should-fix") if "added after the first approval" in l]

    def stale(self, r):
        return [l for l in self.lines(r, "should-fix") if "last code commit" in l]


class LockEntries(Base):
    def test_1_an_entry_added_after_the_first_approval_is_reported(self):
        self.approve("tests/app_test.py")
        self.commit("lock")
        self.approve("tests/other_test.py")
        self.write(f"{CHANGE}/evidence.md", review_test.EVIDENCE)
        self.commit("fix round")
        r = self.review()
        added = self.added(r)
        self.assertEqual(len(added), 1, r.stdout)
        self.assertIn("tests/other_test.py", added[0])

    def test_2_a_lock_at_base_gaining_an_entry_reports_it_and_a_single_approval_reports_nothing(self):
        self.approve("tests/app_test.py")
        self.base = self.commit("lock at base")
        self.approve("tests/other_test.py")
        self.write(f"{CHANGE}/evidence.md", review_test.EVIDENCE)
        self.commit("change")
        self.assertTrue(any("tests/other_test.py" in l for l in self.added(self.review())))
        # A fresh fixture: one approval in the range, nothing added after it.
        self.tearDown()
        self.setUp()
        self.approve("tests/app_test.py", "tests/other_test.py")
        self.write(f"{CHANGE}/evidence.md", review_test.EVIDENCE)
        self.commit("lock")
        self.assertEqual(self.added(self.review()), [])


class CiCommit(Base):
    def code_then_evidence(self, ci_for):
        c1 = self.commit_code("def total(xs):\n    return sum(list(xs))\n")
        self.write(f"{CHANGE}/evidence.md", evidence(ci_for(c1)))
        self.commit("evidence")
        return c1

    def commit_code(self, text):
        self.write("src/app.py", text)
        return self.commit("code")

    def test_3_naming_only_an_older_code_commit_reports_the_last_one(self):
        c1 = self.commit_code("def total(xs):\n    return sum(list(xs))\n")
        c2 = self.commit_code("def total(xs):\n    return sum(tuple(xs))\n")
        self.write(f"{CHANGE}/evidence.md", evidence(f"v2-ci run 4 on {c1[:7]}, green"))
        self.commit("evidence")
        stale = self.stale(self.review())
        self.assertEqual(len(stale), 1, stale)
        self.assertIn(c2[:7], stale[0])
        for named in (c2[:7], c2, c2[:12].upper()):
            self.write(f"{CHANGE}/evidence.md", evidence(f"v2-ci run 5 on {named}, green"))
            self.commit("evidence again")
            self.assertEqual(self.stale(self.review()), [], named)

    def test_4_no_real_commit_named_or_change_folder_commits_report_nothing(self):
        # Fails against treating any 7+ hex as a commit, or counting the change folder's own commits as code.
        self.code_then_evidence(lambda c1: "v2-ci run 1, green")
        self.assertEqual(self.stale(self.review()), [])
        self.write(f"{CHANGE}/evidence.md", evidence("v2-ci run 1 on abc1234, green"))
        self.commit("fake hex")
        self.assertEqual(self.stale(self.review()), [])
        # The evidence commits after the code are inside the change folder, so c1 stays the last code commit.
        c1 = self.git("log", "--format=%H", "-1", "--", "src/app.py").strip()
        self.write(f"{CHANGE}/evidence.md", evidence(f"v2-ci run 2 on {c1[:7]}, green"))
        self.commit("names c1")
        self.write(f"{CHANGE}/progress.md", "# Progress\n")
        self.commit("progress only")
        self.assertEqual(self.stale(self.review()), [])


class SiblingCi(sibling_repos_test.Siblings):
    test_1_the_packet_lists_sibling_files_and_names_both_ranges = None
    test_2_skip_and_stub_in_the_sibling_are_reported_at_their_lines = None
    test_3_a_deleted_sibling_test_file_or_function_is_a_blocker = None
    test_4_a_sibling_test_locked_by_another_change_is_should_fix = None
    test_5_the_flags_go_together_and_repo_must_be_a_git_repository = None

    def test_5_a_stale_sibling_commit_in_ci_names_the_siblings_last_commit(self):
        self.app_change({"src/app.py": "def total(xs):\n    return sum(list(xs))\n"})
        old = sibling_repos_test.git(self.app, "rev-parse", "HEAD").strip()
        self.app_change({"src/app.py": "def total(xs):\n    return sum(tuple(xs))\n"})
        new = sibling_repos_test.git(self.app, "rev-parse", "HEAD").strip()
        ev = self.sf / sibling_repos_test.CHANGE / "evidence.md"
        ev.write_text(sibling_repos_test.EVIDENCE.replace("- **CI**: run 1, green", f"- **CI**: local run 3 on {old[:7]}, pass"))
        sibling_repos_test.git(self.sf, "commit", "-q", "-am", "evidence")
        r = self.review()
        stale = [l for l in r.stdout.splitlines() if l.startswith("should-fix: ") and "last code commit" in l]
        self.assertEqual(len(stale), 1, r.stdout)
        self.assertIn(new[:7], stale[0])
        self.assertIn("../app", stale[0])


if __name__ == "__main__":
    unittest.main(verbosity=2)
