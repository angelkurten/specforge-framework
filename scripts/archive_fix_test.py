#!/usr/bin/env python3
"""Tests for the fixes the adversarial review of archive-on-merge asked for.

    python3 scripts/archive_fix_test.py          # from the specforge directory

Reuses the fixture from scripts/archive_test.py, which is locked and is not
edited here. Findings are those in
changes/2026-10-23-archive-on-merge/evidence.md, Review.
"""

import subprocess
import sys
import textwrap
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from archive_test import CHANGE, LOOP, Repo  # noqa: E402


class ReviewFixTests(Repo):
    def test_a_loop_reports_a_tampered_test_even_when_the_folder_also_moved(self):
        agent = self.root / "fake_agent.py"
        agent.write_text(textwrap.dedent(
            """\
            import os, shutil
            from pathlib import Path
            Path("tests/demo_test.py").write_text("def test_one():\\n    pass\\n")
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
        self.assertIn("locked test changed", r.stdout)
        self.assertIn("tests/demo_test.py", r.stdout)

    def test_b_archive_refuses_a_lock_file_rewritten_since_the_last_commit(self):
        self.write("tests/demo_test.py", "def test_one():\n    pass\n")
        subprocess.run([sys.executable, str(Path(__file__).resolve().parent / "lock_tests.py"),
                        "approve", CHANGE, "tests/demo_test.py"], cwd=self.root, check=True)
        r = self.archive()
        self.assertEqual(r.returncode, 1, r.stdout + r.stderr)
        self.assertIn("locked-tests.txt", r.stdout + r.stderr)
        self.assertNotMoved()

    def test_c_the_guard_protects_only_change_folders_not_every_ancestor(self):
        for cmd in ("mv README.md .", "cp /dev/null tests/", "rm -r tests/__pycache__"):
            r = self.guard("Bash", {"command": cmd})
            self.assertEqual(r.returncode, 0, f"{cmd}: {r.stderr}")
        for cmd in (f"rm -r {CHANGE}", "rm -r changes", f"mv {CHANGE} /tmp/x"):
            r = self.guard("Bash", {"command": cmd})
            self.assertEqual(r.returncode, 2, cmd)


if __name__ == "__main__":
    unittest.main()
