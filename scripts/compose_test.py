#!/usr/bin/env python3
"""Tests for scripts/compose_check.py.

    python3 scripts/compose_test.py          # from the specforge directory

One test per acceptance scenario in
changes/2026-10-23-compose/contract.md, numbered the same way.
"""

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
CHECK = HERE / "compose_check.py"
CHANGE = "changes/2026-10-23-demo"

HEADER = "# Compose\n\n| Lesson | Rung | Artifact | Why not lower |\n|---|---|---|---|\n"


class Fixture(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / CHANGE).mkdir(parents=True)
        self.write("tests/guard_test.py", "def test_guard():\n    assert True\n")
        self.write("scripts/lint_rule.py", "print('rule')\n")
        self.write("examples/contract-direct.md", "# Example\n")
        self.write("AGENTS.md", "# Agents\n")
        self.write("docs/notes.md", "# Notes\n")

    def tearDown(self):
        self.tmp.cleanup()

    def write(self, path, text):
        file = self.root / path
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_text(text)

    def compose(self, *rows):
        self.write(f"{CHANGE}/compose.md", HEADER + "".join(f"| {' | '.join(r)} |\n" for r in rows))

    def check(self):
        return subprocess.run([sys.executable, str(CHECK), CHANGE], cwd=self.root, capture_output=True, text=True)

    def assertRefused(self, *needles):
        r = self.check()
        self.assertEqual(r.returncode, 1, r.stdout + r.stderr)
        for needle in needles:
            self.assertIn(needle, r.stdout)


class ComposeCheckTests(Fixture):
    def test_1_a_valid_record_passes(self):
        self.compose(
            ["git mv slipped past the guard", "1 test", "tests/guard_test.py", "—"],
            ["CLI suite not run", "2 rule", "scripts/lint_rule.py", "a test cannot make a human run a suite"],
            ["contract shape drifted", "3 example", "examples/contract-direct.md", "no rule can judge a contract's prose"],
            ["evidence written late", "4 instruction", "AGENTS.md", "no check sees when evidence was written"],
            ["why v2 skips v1 gates", "5 doc", "docs/notes.md", "nothing to catch: it is background"],
        )
        r = self.check()
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)

    def test_2_a_missing_or_empty_record_is_refused(self):
        self.assertRefused("compose.md")
        self.write(f"{CHANGE}/compose.md", HEADER)
        self.assertRefused("no lesson")

    def test_3_an_unknown_rung_is_refused_by_row(self):
        self.compose(["flaky test", "6 meeting", "docs/notes.md", "we talked"])
        self.assertRefused("flaky test", "rung")

    def test_4_a_missing_artifact_is_refused_by_path(self):
        self.compose(["lesson", "1 test", "tests/nope_test.py", "—"])
        self.assertRefused("tests/nope_test.py")

    def test_5_climbing_without_a_reason_is_refused(self):
        for why in ("—", "-", ""):
            self.compose(["lesson", "4 instruction", "AGENTS.md", why])
            self.assertRefused("lesson", "why")

    def test_6_a_rung_1_artifact_must_be_a_test(self):
        self.compose(["lesson", "1 test", "scripts/lint_rule.py", "—"])
        self.assertRefused("scripts/lint_rule.py", "test")

    def test_7_an_instruction_file_over_80_lines_is_refused(self):
        for name in ("AGENTS.md", "CLAUDE.md"):
            self.write(name, "line\n" * 81)
            self.compose(["lesson", "4 instruction", name, "no check can see it"])
            self.assertRefused(name, "81")


if __name__ == "__main__":
    unittest.main()
