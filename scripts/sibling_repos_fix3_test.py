#!/usr/bin/env python3
"""Third fix round for specforge/changes/2026-10-26-sibling-repos, from the
re-verification: a sibling reached through a symlink lost the foreign-lock finding,
because the packet resolved the sibling's path and the lock entry did not.

    python3 scripts/sibling_repos_fix3_test.py          # from the specforge directory

Reuses the two-repository fixture of scripts/sibling_repos_test.py.
"""

import hashlib
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import sibling_repos_test as base  # noqa: E402

LINKED = "specforge/changes/archive/2026-10-02-linked"


class SiblingReposFix3Tests(base.Siblings):
    # The fixture's own scenarios run in sibling_repos_test.py, not again here.
    test_1_the_packet_lists_sibling_files_and_names_both_ranges = None
    test_2_skip_and_stub_in_the_sibling_are_reported_at_their_lines = None
    test_3_a_deleted_sibling_test_file_or_function_is_a_blocker = None
    test_4_a_sibling_test_locked_by_another_change_is_should_fix = None
    test_5_the_flags_go_together_and_repo_must_be_a_git_repository = None

    def test_15_a_lock_entry_through_a_symlinked_sibling_still_matches(self):
        # Fails against comparing the resolved sibling path with the lock entry as written.
        (self.sf.parent / "applink").symlink_to(self.app)
        sha = hashlib.sha256(base.APP_TEST.encode()).hexdigest()
        lock = self.sf / LINKED / "locked-tests.txt"
        lock.parent.mkdir(parents=True)
        lock.write_text(f"{sha}  ../applink/tests/app_test.py\n")
        base.git(self.sf, "add", "-A")
        base.git(self.sf, "commit", "-q", "-m", "linked lock")
        self.sf_base = base.git(self.sf, "rev-parse", "HEAD").strip()
        with open(self.sf / base.CHANGE / "evidence.md", "a") as f:
            f.write("\n")
        base.git(self.sf, "commit", "-q", "-am", "evidence")
        self.app_change({"tests/app_test.py": base.APP_TEST.replace("== 3", "== 4")})
        for repo in ("../applink", "../app"):
            r = self.review("--repo", repo, "--repo-base", self.app_base)
            self.assertTrue(any("2026-10-02-linked" in l for l in self.lines(r, "should-fix")), f"{repo}\n{r.stdout}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
