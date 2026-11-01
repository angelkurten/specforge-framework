#!/usr/bin/env python3
"""Fix round 2 of specforge/changes/2026-11-01-retired-tests (re-verification should-fix):
scenario 12. The late-entry check finds the contract's first version across an archive
move, as the lock checks do.

    python3 scripts/retired_tests_fix2_test.py          # from the specforge directory
"""

import subprocess
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import review_test  # noqa: E402
import retired_tests_test as base  # noqa: E402

CHANGE = review_test.CHANGE
ARCHIVED = CHANGE.replace("specforge/changes/", "specforge/changes/archive/")
DASH = base.DASH


class ArchivedContract(review_test.Repo):
    def lines(self, r, severity):
        return [l for l in r.stdout.splitlines() if l.startswith(f"{severity}: ")]

    def test_12_a_late_entry_is_flagged_after_an_archive_move(self):
        self.git("rm", "-q", f"{CHANGE}/contract.md")
        self.git("commit", "-q", "-m", "no contract at base")
        self.base = self.git("rev-parse", "HEAD").strip()
        self.write(f"{CHANGE}/contract.md", base.contract(f"tests/other_test.py{DASH}approved with the contract"))
        self.git("add", "-A")
        self.git("commit", "-q", "-m", "contract")
        self.change({f"{CHANGE}/contract.md": base.contract(
            f"tests/other_test.py{DASH}approved with the contract",
            f"tests/app_test.py{DASH}slipped in later")}, deletes=["tests/other_test.py", "tests/app_test.py"])
        (self.root / ARCHIVED).parent.mkdir(parents=True, exist_ok=True)
        self.git("mv", CHANGE, ARCHIVED)
        self.git("commit", "-q", "-m", "archive")
        r = subprocess.run([sys.executable, str(review_test.PREP), ARCHIVED, "--base", self.base],
                           cwd=self.root, capture_output=True, text=True)
        flagged = [l for l in self.lines(r, "should-fix") if "added after the contract's first version" in l]
        # Fails against looking the contract up only under its archived path: the first revision
        # holding it is then the archive commit, which already carries the late bullet.
        self.assertEqual(len(flagged), 1, r.stdout + r.stderr)
        self.assertIn("tests/app_test.py", flagged[0])


if __name__ == "__main__":
    unittest.main(verbosity=2)
