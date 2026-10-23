#!/usr/bin/env python3
"""Tests for scripts/lock_tests.py, scripts/loop.py and the Claude Code lock guard.

    python3 scripts/loop_test.py          # from the specforge directory

One test per acceptance scenario in
changes/2026-10-23-execution-loop/contract.md, numbered the same way. The
driver is exercised against a fake agent, a short Python script that edits the
progress file the way a real agent would, so nothing here needs a model.
"""

import json
import os
import subprocess
import sys
import tempfile
import textwrap
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
LOCK = HERE / "lock_tests.py"
LOOP = HERE / "loop.py"
GUARD = REPO / ".claude" / "hooks" / "specforge_lock_guard.py"

PROGRESS = """\
# Progress

**Budget**: {budget}

## Tasks

- [ ] test_one
- [ ] test_two

## Blocked

## Log
"""

# The fake agent reads FAKE_MODE and does one thing per iteration, then exits.
FAKE_AGENT = textwrap.dedent(
    """\
    import json, os, re, sys
    from pathlib import Path
    change = Path(os.environ["SPECFORGE_CHANGE_DIR"])
    progress = change / "progress.md"
    text = progress.read_text()
    mode = os.environ["FAKE_MODE"]
    if mode == "tick":
        text = text.replace("- [ ]", "- [x]", 1)
    elif mode == "block":
        text = text.replace("## Blocked\\n", "## Blocked\\n\\nBLOCKED: the contract contradicts the schema\\n")
    elif mode == "tamper":
        Path(os.environ["FAKE_TEST"]).write_text("def test_one():\\n    pass\\n")
    elif mode == "cost":
        print(json.dumps({"type": "result", "total_cost_usd": 1.5}))
    progress.write_text(text)
    """
)


def run(args, **kw):
    return subprocess.run(
        [sys.executable, *map(str, args)], capture_output=True, text=True, **kw
    )


class Fixture(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.change = self.root / "changes" / "2026-10-23-demo"
        self.change.mkdir(parents=True)
        self.test_file = self.root / "tests" / "demo_test.py"
        self.test_file.parent.mkdir()
        self.test_file.write_text("def test_one():\n    assert False\n")
        self.agent = self.root / "fake_agent.py"
        self.agent.write_text(FAKE_AGENT)

    def tearDown(self):
        self.tmp.cleanup()

    def approve(self):
        r = run([LOCK, "approve", self.change, "tests/demo_test.py"], cwd=self.root)
        self.assertEqual(r.returncode, 0, r.stderr)

    def loop(self, mode, budget="10 iterations", extra=()):
        (self.change / "progress.md").write_text(PROGRESS.format(budget=budget))
        env = dict(os.environ, FAKE_MODE=mode, FAKE_TEST=str(self.test_file))
        return run(
            [LOOP, self.change, "--agent", f"{sys.executable} {self.agent}", *extra],
            cwd=self.root,
            env=env,
        )

    def guard(self, tool, tool_input):
        payload = {"tool_name": tool, "tool_input": tool_input, "cwd": str(self.root)}
        env = dict(os.environ, CLAUDE_PROJECT_DIR=str(self.root))
        return subprocess.run(
            [sys.executable, str(GUARD)],
            input=json.dumps(payload),
            capture_output=True,
            text=True,
            env=env,
        )


class LockTests(Fixture):
    def test_1_approve_records_one_hash_per_file_and_check_is_clean(self):
        self.approve()
        lines = (self.change / "locked-tests.txt").read_text().splitlines()
        self.assertEqual(len(lines), 1)
        digest, path = lines[0].split("  ", 1)
        self.assertEqual(len(digest), 64)
        self.assertEqual(path, "tests/demo_test.py")
        r = run([LOCK, "check", self.change], cwd=self.root)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)

    def test_2_check_reports_a_changed_test(self):
        self.approve()
        self.test_file.write_text("def test_one():\n    pass\n")
        r = run([LOCK, "check", self.change], cwd=self.root)
        self.assertEqual(r.returncode, 1)
        self.assertIn("tests/demo_test.py", r.stdout)


class GuardTests(Fixture):
    def test_3_refuses_edit_and_write_on_a_locked_path(self):
        self.approve()
        for tool in ("Edit", "Write", "MultiEdit"):
            for path in (str(self.test_file), "tests/demo_test.py"):
                r = self.guard(tool, {"file_path": path})
                self.assertEqual(r.returncode, 2, f"{tool} {path}")
                self.assertIn("locked", r.stderr)

    def test_4_allows_edit_on_an_unlocked_path(self):
        self.approve()
        r = self.guard("Edit", {"file_path": str(self.root / "src" / "app.py")})
        self.assertEqual(r.returncode, 0, r.stderr)

    def test_5_refuses_bash_writes_and_allows_bash_reads(self):
        self.approve()
        writes = [
            "echo x > tests/demo_test.py",
            "sed -i 's/False/True/' tests/demo_test.py",
            "rm tests/demo_test.py",
            "mv /tmp/x tests/demo_test.py",
            "cp other.py tests/demo_test.py",
            "git checkout -- tests/demo_test.py",
            f"cat new.py > {self.test_file}",
        ]
        for cmd in writes:
            r = self.guard("Bash", {"command": cmd})
            self.assertEqual(r.returncode, 2, cmd)
        reads = [
            "python3 -m pytest tests/demo_test.py",
            "cat tests/demo_test.py",
            "grep -n assert tests/demo_test.py",
            "echo x > src/app.py",
        ]
        for cmd in reads:
            r = self.guard("Bash", {"command": cmd})
            self.assertEqual(r.returncode, 0, f"{cmd}: {r.stderr}")


class LoopTests(Fixture):
    def test_6_exits_0_when_every_task_is_ticked(self):
        r = self.loop("tick")
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn("done", r.stdout)

    def test_7_stops_after_3_iterations_without_progress(self):
        r = self.loop("idle")
        self.assertEqual(r.returncode, 2, r.stdout + r.stderr)
        self.assertIn("no progress", r.stdout)
        self.assertIn("iteration 3", r.stdout)
        self.assertNotIn("iteration 4", r.stdout)

    def test_8_stops_at_the_iteration_cap(self):
        r = self.loop("tick", budget="1 iterations")
        self.assertEqual(r.returncode, 3, r.stdout + r.stderr)
        self.assertIn("budget", r.stdout)

    def test_9_stops_when_summed_cost_passes_the_cap(self):
        r = self.loop("cost", budget="10 iterations, 2 USD")
        self.assertEqual(r.returncode, 3, r.stdout + r.stderr)
        self.assertIn("budget", r.stdout)
        self.assertIn("iteration 2", r.stdout)
        self.assertNotIn("iteration 3", r.stdout)

    def test_10_stops_the_iteration_a_locked_test_changes(self):
        self.approve()
        r = self.loop("tamper")
        self.assertEqual(r.returncode, 4, r.stdout + r.stderr)
        self.assertIn("locked test changed", r.stdout)
        self.assertIn("tests/demo_test.py", r.stdout)

    def test_11_stops_when_the_agent_writes_blocked(self):
        r = self.loop("block")
        self.assertEqual(r.returncode, 5, r.stdout + r.stderr)
        self.assertIn("blocked", r.stdout)
        self.assertIn("contradicts the schema", r.stdout)


if __name__ == "__main__":
    unittest.main()
