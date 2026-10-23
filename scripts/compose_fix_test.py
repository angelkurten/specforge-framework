#!/usr/bin/env python3
"""Tests for the fixes the adversarial review of the compose change asked for.

    python3 scripts/compose_fix_test.py          # from the specforge directory

Reuses the fixtures from scripts/compose_test.py and scripts/review_test.py,
both locked and not edited here.
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from compose_test import Fixture  # noqa: E402
from review_test import Repo  # noqa: E402


class ComposeArtifactTests(Fixture):
    def test_an_artifact_outside_the_repository_is_refused(self):
        # Both exist, so only the containment check can refuse them; a rung-1
        # row would also be refused for not being a test, which proves nothing.
        outside = self.root.parent / f"{self.root.name}-outside.py"
        outside.write_text("print('rule')\n")
        self.addCleanup(outside.unlink)
        for path in ("/etc/hosts", f"../{outside.name}"):
            self.compose(["lesson", "2 rule", path, "a test cannot see it"])
            self.assertRefused(path)

    def test_a_directory_is_not_an_artifact(self):
        self.compose(["lesson", "1 test", "tests/", "—"])
        self.assertRefused("tests/")
        self.compose(["lesson", "2 rule", "scripts", "a test cannot see it"])
        self.assertRefused("scripts")


class EmptyRangeTests(Repo):
    def test_an_empty_range_is_a_blocker(self):
        r = self.review()
        self.assertEqual(r.returncode, 1, r.stdout + r.stderr)
        self.assertTrue(any(l.startswith("blocker: ") and "empty" in l for l in r.stdout.splitlines()), r.stdout)


if __name__ == "__main__":
    unittest.main()
