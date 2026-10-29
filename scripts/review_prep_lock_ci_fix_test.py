#!/usr/bin/env python3
"""Fix round for specforge/changes/2026-10-29-review-prep-lock-and-ci, from its
review (PASS, should-fix): check (b) counted an archive move and earlier
change-folder commits as code, and read the CI field with a regex narrower than
evidence_findings'. Also, the finding now cites the CI field's line.

    python3 scripts/review_prep_lock_ci_fix_test.py          # from the specforge directory
"""

import subprocess
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import review_test  # noqa: E402
from review_prep_lock_ci_test import Base, evidence  # noqa: E402

CHANGE = review_test.CHANGE
ARCHIVED = CHANGE.replace("/changes/", "/changes/archive/")


class FixRound(Base):
    def stale_for(self, change):
        r = subprocess.run([sys.executable, str(review_test.PREP), change, "--base", self.base],
                           cwd=self.root, capture_output=True, text=True)
        return [l for l in r.stdout.splitlines() if l.startswith("should-fix: ") and "last code commit" in l]

    def test_6_an_archive_move_and_the_change_folders_own_commits_are_not_code(self):
        # Fails against excluding only the literal <change> path: the archived folder's history then counts as code.
        self.write("src/app.py", "def total(xs):\n    return sum(list(xs))\n")
        c1 = self.commit("code")
        self.write(f"{CHANGE}/evidence.md", evidence(f"v2-ci run 1 on {c1[:7]}, green"))
        self.commit("evidence")
        self.write(f"{CHANGE}/progress.md", "# Progress\n")
        self.commit("progress")
        self.assertEqual(self.stale_for(CHANGE), [])
        (self.root / ARCHIVED).parent.mkdir(parents=True, exist_ok=True)
        self.git("mv", CHANGE, ARCHIVED)
        self.commit("archive")
        self.assertEqual(self.stale_for(ARCHIVED), [])

    def test_7_a_sub_bullet_after_a_blank_line_belongs_to_the_ci_field_and_the_finding_cites_its_line(self):
        self.write("src/app.py", "def total(xs):\n    return sum(list(xs))\n")
        c1 = self.commit("code")
        self.write("src/app.py", "def total(xs):\n    return sum(tuple(xs))\n")
        c2 = self.commit("fix round")
        ci = f"v2-ci run 1 on {c1[:7]}, green\n\n  - fix round: v2-ci run 2 on {c2[:7]}, green"
        self.write(f"{CHANGE}/evidence.md", evidence(ci))
        self.commit("evidence")
        # Fails against reading the CI field without evidence_findings' blank-line continuation.
        self.assertEqual(self.stale_for(CHANGE), [])
        self.write(f"{CHANGE}/evidence.md", evidence(f"v2-ci run 1 on {c1[:7]}, green"))
        self.commit("stale evidence")
        stale = self.stale_for(CHANGE)
        self.assertEqual(len(stale), 1, stale)
        text = (self.root / CHANGE / "evidence.md").read_text().splitlines()
        line = next(i for i, l in enumerate(text, 1) if l.startswith("- **CI**:"))
        self.assertIn(f"evidence.md:{line} ", stale[0])


if __name__ == "__main__":
    unittest.main(verbosity=2)
