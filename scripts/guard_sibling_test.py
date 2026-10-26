#!/usr/bin/env python3
"""Edge test for the lock guard on a test in a sibling repository: a Direct change
(2026-10-26), from the sibling Explore. With the session in specforge and the test
in ../<sibling>/, the guard found the hit and then crashed building its message
(`relative_to`), exiting 1, which a PreToolUse hook treats as non-blocking.

    python3 scripts/guard_sibling_test.py          # from the specforge directory
"""

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
LOCK = REPO / "specforge" / "scripts" / "lock_tests.py"
GUARD = REPO / ".claude" / "hooks" / "specforge_lock_guard.py"


class GuardSiblingTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        base = Path(self.tmp.name)
        self.root = base / "specforge"
        self.change = self.root / "specforge" / "changes" / "2026-10-26-demo"
        self.change.mkdir(parents=True)
        self.test_file = base / "app" / "tests" / "demo_test.py"
        self.test_file.parent.mkdir(parents=True)
        self.test_file.write_text("def test_one():\n    assert False\n")
        r = subprocess.run([sys.executable, str(LOCK), "approve", str(self.change), "../app/tests/demo_test.py"],
                           cwd=self.root, capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr)

    def tearDown(self):
        self.tmp.cleanup()

    def guard(self, tool, tool_input):
        payload = {"tool_name": tool, "tool_input": tool_input, "cwd": str(self.root)}
        return subprocess.run([sys.executable, str(GUARD)], input=json.dumps(payload), capture_output=True,
                              text=True, env=dict(os.environ, CLAUDE_PROJECT_DIR=str(self.root)))

    def test_1_edits_to_a_sibling_locked_test_are_refused_with_exit_2(self):
        for path in (str(self.test_file), "../app/tests/demo_test.py"):
            r = self.guard("Edit", {"file_path": path})
            self.assertEqual(r.returncode, 2, f"{path}: {r.stderr[-300:]}")
            self.assertIn("demo_test.py is locked", r.stderr)
            self.assertNotIn("Traceback", r.stderr)

    def test_2_a_bash_write_to_it_is_refused_with_exit_2(self):
        r = self.guard("Bash", {"command": "echo x > ../app/tests/demo_test.py"})
        self.assertEqual(r.returncode, 2, r.stderr[-300:])

    def test_3_sibling_code_stays_editable(self):
        r = self.guard("Edit", {"file_path": str(self.test_file.parent.parent / "src" / "app.py")})
        self.assertEqual(r.returncode, 0, r.stderr[-300:])


if __name__ == "__main__":
    unittest.main(verbosity=2)
