#!/usr/bin/env python3
"""Tests for specforge/changes/2026-10-27-compose-siblings: compose_check.py accepts a
code sibling's artifacts, and archive.py refuses a compose.md that compose_check
rejects. One test per acceptance scenario, numbered the same way.

    python3 scripts/compose_siblings_test.py          # from the specforge directory
"""

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from archive_test import ARCHIVED, CHANGE, Repo  # noqa: E402

CHECK = HERE.parent / "specforge" / "scripts" / "compose_check.py"
HEADER = "# Compose\n\n| Lesson | Rung | Artifact | Why not lower |\n|---|---|---|---|\n"


def row(artifact, rung="1 test", why="—"):
    return f"| the lesson | {rung} | `{artifact}` | {why} |\n"


class Siblings(unittest.TestCase):
    """specforge/ is the repository root; app/ beside it is a git repository, plain/ is not."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.base = Path(self.tmp.name).resolve()
        self.root = self.base / "specforge"
        (self.root / CHANGE).mkdir(parents=True)
        (self.base / "app" / "tests").mkdir(parents=True)
        (self.base / "app" / "tests" / "app_test.py").write_text("def test_a():\n    assert True\n")
        subprocess.run(["git", "init", "-q"], cwd=self.base / "app", check=True)
        (self.base / "plain").mkdir()
        (self.base / "plain" / "notes.md").write_text("# Notes\n")
        (self.base / "x.md").write_text("# Outside\n")

    def tearDown(self):
        self.tmp.cleanup()

    def check(self, *rows):
        (self.root / CHANGE / "compose.md").write_text(HEADER + "".join(rows))
        return subprocess.run([sys.executable, str(CHECK), CHANGE], cwd=self.root, capture_output=True, text=True)

    def test_1_a_sibling_repositorys_test_is_accepted_relative_or_absolute(self):
        for artifact in ("../app/tests/app_test.py", str(self.base / "app" / "tests" / "app_test.py")):
            r = self.check(row(artifact))
            self.assertEqual(r.returncode, 0, f"{artifact}: {r.stdout}")

    def test_2_outside_the_repository_and_its_sibling_repositories_is_refused(self):
        (self.root / "link.md").symlink_to(self.base.parent / "elsewhere.md")
        (self.base.parent / "elsewhere.md").write_text("# Elsewhere\n")
        try:
            for artifact in ("../plain/notes.md", "../x.md", "link.md"):
                r = self.check(row(artifact, "5 doc", "a reason"))
                self.assertEqual(r.returncode, 1, artifact)
                self.assertIn("outside the repository", r.stdout, artifact)
        finally:
            (self.base.parent / "elsewhere.md").unlink()

    def test_3_a_missing_sibling_file_does_not_exist(self):
        r = self.check(row("../app/tests/missing_test.py"))
        self.assertEqual(r.returncode, 1)
        self.assertIn("does not exist", r.stdout)


class ArchiveCompose(Repo):
    def commit(self):
        self.git("add", "-A")
        self.git("commit", "-q", "-m", "compose")

    def test_4_archive_refuses_a_compose_that_compose_check_rejects(self):
        self.write(f"{CHANGE}/compose.md", HEADER + row("tests/missing_test.py"))
        self.commit()
        r = self.archive()
        self.assertEqual(r.returncode, 1, r.stdout)
        self.assertIn("archive: refused — compose:", r.stdout)
        self.assertTrue((self.root / CHANGE).is_dir())
        self.assertFalse((self.root / ARCHIVED).exists())

    def test_5_a_valid_compose_or_none_still_archives(self):
        self.write(f"{CHANGE}/compose.md", HEADER + row("tests/demo_test.py"))
        self.commit()
        r = self.archive()
        self.assertEqual(r.returncode, 0, r.stdout)
        self.assertTrue((self.root / ARCHIVED).is_dir())


class ArchiveWithoutCompose(Repo):
    def test_5b_a_change_with_no_compose_still_archives(self):
        r = self.archive()
        self.assertEqual(r.returncode, 0, r.stdout)


if __name__ == "__main__":
    unittest.main(verbosity=2)
