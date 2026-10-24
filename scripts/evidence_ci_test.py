#!/usr/bin/env python3
"""Tests for the required CI field in evidence reports.

    python3 scripts/evidence_ci_test.py          # from the specforge directory

One test per acceptance scenario in
specforge/changes/2026-10-24-evidence-ci-field/contract.md.
"""

import subprocess
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from archive_test import ARCHIVE, CHANGE, Repo  # noqa: E402
from review_test import PREP  # noqa: E402

TEMPLATE = Path(__file__).resolve().parent.parent / "templates" / "evidence-report.md"
COMPLETE = """\
## Evidence

- **Ran**: python3 -m pytest
- **Result**: 1 passed
- **CI**: v2-ci run 1 and cli-ci run 1, both green on abc1234
- **Not checked**: nothing; every scenario ran
- **Deviations from the contract**: none
"""


class EvidenceCiTests(Repo):
    def evidence(self, text):
        self.write(f"{CHANGE}/evidence.md", text)
        self.git("add", "-A")
        self.git("commit", "-q", "-m", "evidence")

    def blockers(self):
        r = subprocess.run([sys.executable, str(PREP), CHANGE, "--base", "HEAD~1"], cwd=self.root, capture_output=True, text=True)
        return [l for l in r.stdout.splitlines() if l.startswith("blocker: ") and "evidence" in l]

    def test_1_a_missing_ci_field_is_a_blocker(self):
        self.evidence(COMPLETE.replace("- **CI**: v2-ci run 1 and cli-ci run 1, both green on abc1234\n", ""))
        self.assertTrue(any("'CI'" in l for l in self.blockers()), self.blockers())

    def test_2_an_empty_ci_field_is_a_blocker(self):
        self.evidence(COMPLETE.replace("v2-ci run 1 and cli-ci run 1, both green on abc1234", ""))
        self.assertTrue(any("'CI'" in l for l in self.blockers()), self.blockers())

    def test_3_a_filled_ci_field_passes(self):
        self.evidence(COMPLETE)
        self.assertEqual(self.blockers(), [])

    def test_4_archive_refuses_evidence_without_ci(self):
        self.evidence(COMPLETE.replace("- **CI**: v2-ci run 1 and cli-ci run 1, both green on abc1234\n", ""))
        r = subprocess.run([sys.executable, str(ARCHIVE), CHANGE], cwd=self.root, capture_output=True, text=True)
        self.assertEqual(r.returncode, 1, r.stdout + r.stderr)
        self.assertIn("CI", r.stdout)

    def test_5_the_template_carries_a_ci_field(self):
        self.assertIn("- **CI**:", TEMPLATE.read_text())


if __name__ == "__main__":
    unittest.main()
