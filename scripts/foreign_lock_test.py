#!/usr/bin/env python3
"""Tests for review_prep.py's check on tests locked by another change: a Direct
change (2026-10-26), from the compose of specforge/changes/archive/2026-10-26-release-0-28-0,
where a test locked by an archived change was re-locked elsewhere and no
mechanical finding said so.

    python3 scripts/foreign_lock_test.py          # from the specforge directory

Reuses the throwaway-repository fixture of scripts/review_test.py.
"""

import hashlib
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from review_test import BASE_FILES, CHANGE, Repo  # noqa: E402

OLD = "specforge/changes/archive/2026-10-01-old"


class ForeignLockTests(Repo):
    def lock(self, folder, path):
        sha = hashlib.sha256(BASE_FILES[path].encode()).hexdigest()
        self.write(f"{folder}/locked-tests.txt", f"{sha}  {path}\n")
        self.git("add", "-A")
        self.git("commit", "-q", "-m", "lock")
        self.base = self.git("rev-parse", "HEAD").strip()

    def foreign(self, result):
        return [l for l in result.stdout.splitlines() if "locked by" in l]

    def test_1_editing_a_test_an_archived_change_locked_is_should_fix(self):
        self.lock(OLD, "tests/other_test.py")
        self.change({"tests/other_test.py": "def test_other():\n    assert 1 == 1\n"})
        r = self.review()
        self.assertFinding(r, "should-fix", "tests/other_test.py:1")
        self.assertTrue(any("2026-10-01-old" in l for l in self.foreign(r)), r.stdout)

    def test_2_deleting_it_is_reported_too(self):
        self.lock(OLD, "tests/other_test.py")
        self.change(deletes=["tests/other_test.py"])
        self.assertEqual(len(self.foreign(self.review())), 1)

    def test_3_the_change_under_review_is_not_foreign_to_itself(self):
        # Fails against treating every lock as foreign, the change's own and its archived copy included.
        self.lock(CHANGE, "tests/app_test.py")
        self.lock(CHANGE.replace("/changes/", "/changes/archive/"), "tests/app_test.py")
        self.change({"tests/app_test.py": BASE_FILES["tests/app_test.py"].replace("== 3", "== 4")})
        self.assertEqual(self.foreign(self.review()), [])

    def test_4_an_untouched_locked_test_reports_nothing(self):
        # Fails against reporting every entry of every foreign lock.
        self.lock(OLD, "tests/other_test.py")
        self.change({"src/app.py": "def total(xs):\n    return sum(list(xs))\n"})
        self.assertEqual(self.foreign(self.review()), [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
