#!/usr/bin/env python3
"""Regression test: git rm and git mv of a change folder stay refused.

    python3 scripts/guard_git_test.py          # from the specforge directory

The re-verification of specforge/changes/archive/2026-10-23-archive-on-merge found that the fix
narrowing the guard to lock-holding folders dropped the git forms. Reuses the
fixture from scripts/archive_test.py, which is locked.
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from archive_test import CHANGE, Repo  # noqa: E402


class GitFormsTests(Repo):
    def test_git_rm_and_git_mv_of_a_lock_or_its_folder_are_refused(self):
        lock = f"{CHANGE}/locked-tests.txt"
        for cmd in (f"git rm -r {CHANGE}", f"git mv {CHANGE} /tmp/x", f"git rm {lock}", f"git mv {lock} /tmp/x", "git rm -r specforge/changes"):
            r = self.guard("Bash", {"command": cmd})
            self.assertEqual(r.returncode, 2, cmd)

    def test_git_mv_into_a_folder_is_allowed(self):
        r = self.guard("Bash", {"command": "git mv README.md docs/"})
        self.assertEqual(r.returncode, 0, r.stderr)


if __name__ == "__main__":
    unittest.main()
