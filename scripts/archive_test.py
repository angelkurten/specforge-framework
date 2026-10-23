#!/usr/bin/env python3
"""Tests for scripts/archive.py, and the lock guard and loop changes that go with it.

    python3 scripts/archive_test.py          # from the specforge directory

One test per acceptance scenario in
specforge/changes/archive/2026-10-23-archive-on-merge/contract.md, numbered the same way. Each
runs in a throwaway git repository holding one finished change.
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
SCRIPTS = HERE.parent / "specforge" / "scripts"
REPO = HERE.parent
ARCHIVE = SCRIPTS / "archive.py"
LOCK = SCRIPTS / "lock_tests.py"
LOOP = SCRIPTS / "loop.py"
GUARD = REPO / ".claude" / "hooks" / "specforge_lock_guard.py"

NAME = "2026-10-23-demo"
CHANGE = f"specforge/changes/{NAME}"
ARCHIVED = f"specforge/changes/archive/{NAME}"

EVIDENCE = """\
## Evidence

- **Ran**: python3 -m pytest
- **Result**: 1 passed
- **Not checked**: nothing; every scenario ran
- **Deviations from the contract**: none
"""


class Repo(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.git("init", "-q", "-b", "main")
        self.git("config", "user.email", "t@example.com")
        self.git("config", "user.name", "t")
        self.write(f"{CHANGE}/contract.md", "# Demo\n\n**Mode**: Contract\n")
        self.write(f"{CHANGE}/progress.md", "# Progress\n\n**Budget**: 5 iterations\n\n## Tasks\n\n- [ ] test_one\n\n## Blocked\n\n## Log\n")
        self.write(f"{CHANGE}/evidence.md", EVIDENCE)
        self.write("tests/demo_test.py", "def test_one():\n    assert 1 + 1 == 2\n")
        subprocess.run([sys.executable, str(LOCK), "approve", CHANGE, "tests/demo_test.py"], cwd=self.root, check=True)
        self.git("add", "-A")
        self.git("commit", "-q", "-m", "change")

    def tearDown(self):
        self.tmp.cleanup()

    def git(self, *args):
        return subprocess.run(["git", *args], cwd=self.root, capture_output=True, text=True, check=True).stdout

    def write(self, path, text):
        file = self.root / path
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_text(text)

    def archive(self, change=CHANGE):
        return subprocess.run([sys.executable, str(ARCHIVE), change], cwd=self.root, capture_output=True, text=True)

    def guard(self, tool, tool_input):
        payload = {"tool_name": tool, "tool_input": tool_input, "cwd": str(self.root)}
        env = dict(os.environ, CLAUDE_PROJECT_DIR=str(self.root))
        return subprocess.run([sys.executable, str(GUARD)], input=json.dumps(payload), capture_output=True, text=True, env=env)

    def assertNotMoved(self):
        self.assertTrue((self.root / CHANGE / "contract.md").is_file())
        self.assertFalse((self.root / ARCHIVED).exists())


class ArchiveTests(Repo):
    def test_1_a_finished_change_moves_to_archive(self):
        r = self.archive()
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertFalse((self.root / CHANGE).exists())
        for name in ("contract.md", "progress.md", "evidence.md", "locked-tests.txt"):
            self.assertTrue((self.root / ARCHIVED / name).is_file(), name)

    def test_2_its_tests_are_unlocked_after_archiving(self):
        self.assertEqual(self.guard("Edit", {"file_path": "tests/demo_test.py"}).returncode, 2)
        self.assertEqual(self.archive().returncode, 0)
        r = self.guard("Edit", {"file_path": "tests/demo_test.py"})
        self.assertEqual(r.returncode, 0, r.stderr)

    def test_3_incomplete_evidence_refuses_and_names_the_field(self):
        self.write(f"{CHANGE}/evidence.md", EVIDENCE.replace("1 passed", ""))
        r = self.archive()
        self.assertEqual(r.returncode, 1, r.stdout + r.stderr)
        self.assertIn("Result", r.stdout + r.stderr)
        self.assertNotMoved()
        (self.root / CHANGE / "evidence.md").unlink()
        r = self.archive()
        self.assertEqual(r.returncode, 1, r.stdout + r.stderr)
        self.assertIn("evidence", r.stdout + r.stderr)
        self.assertNotMoved()

    def test_4_a_changed_locked_test_refuses_and_names_it(self):
        self.write("tests/demo_test.py", "def test_one():\n    pass\n")
        r = self.archive()
        self.assertEqual(r.returncode, 1, r.stdout + r.stderr)
        self.assertIn("tests/demo_test.py", r.stdout + r.stderr)
        self.assertNotMoved()

    def test_5_an_archived_change_or_existing_target_refuses(self):
        self.assertEqual(self.archive().returncode, 0)
        r = self.archive(ARCHIVED)
        self.assertEqual(r.returncode, 1, r.stdout + r.stderr)
        self.assertTrue((self.root / ARCHIVED / "contract.md").is_file())
        self.write(f"{CHANGE}/contract.md", "# Demo again\n")
        self.write(f"{CHANGE}/evidence.md", EVIDENCE)
        r = self.archive()
        self.assertEqual(r.returncode, 1, r.stdout + r.stderr)
        self.assertEqual((self.root / ARCHIVED / "contract.md").read_text(), "# Demo\n\n**Mode**: Contract\n")
        self.assertTrue((self.root / CHANGE / "contract.md").is_file())

    def test_6_a_tracked_folder_moves_with_git_mv(self):
        self.assertEqual(self.archive().returncode, 0)
        status = self.git("status", "--porcelain")
        self.assertIn(f"R  {CHANGE}/contract.md -> {ARCHIVED}/contract.md", status)


class GuardTests(Repo):
    def test_7_the_guard_protects_locked_tests_txt(self):
        lock = f"{CHANGE}/locked-tests.txt"
        for tool in ("Edit", "Write"):
            for path in (lock, str(self.root / lock)):
                r = self.guard(tool, {"file_path": path})
                self.assertEqual(r.returncode, 2, f"{tool} {path}")
        for cmd in (f"rm {lock}", f"mv {lock} /tmp/x", f"echo > {lock}", f"rm -r {CHANGE}"):
            r = self.guard("Bash", {"command": cmd})
            self.assertEqual(r.returncode, 2, cmd)
        r = self.guard("Bash", {"command": f"cat {lock}"})
        self.assertEqual(r.returncode, 0, r.stderr)
        r = self.guard("Bash", {"command": f"python3 scripts/lock_tests.py approve {CHANGE} tests/demo_test.py"})
        self.assertEqual(r.returncode, 0, r.stderr)


class LoopTests(Repo):
    def test_8_the_loop_stops_when_its_change_folder_moves(self):
        agent = self.root / "fake_agent.py"
        agent.write_text(textwrap.dedent(
            """\
            import os, shutil
            from pathlib import Path
            change = Path(os.environ["SPECFORGE_CHANGE_DIR"])
            target = change.parent / "archive" / change.name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(change), str(target))
            """
        ))
        r = subprocess.run(
            [sys.executable, str(LOOP), CHANGE, "--agent", f"{sys.executable} {agent}"],
            cwd=self.root, capture_output=True, text=True,
        )
        self.assertEqual(r.returncode, 4, r.stdout + r.stderr)
        self.assertIn("change folder moved", r.stdout)


if __name__ == "__main__":
    unittest.main()
