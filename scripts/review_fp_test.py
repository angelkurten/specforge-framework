#!/usr/bin/env python3
"""Tests for the false-positive heuristics in scripts/review_prep.py.

    python3 scripts/review_fp_test.py          # from the specforge directory

One test per acceptance scenario in
specforge/changes/archive/2026-10-23-review-false-positives/contract.md, numbered the same way.
Reuses the throwaway-repository fixture from scripts/review_test.py, which is
locked and is not edited here.
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from review_test import BASE_FILES, Repo  # noqa: E402


def findings(result, severity):
    return [l for l in result.stdout.splitlines() if l.startswith(f"{severity}: ")]


class FalsePositiveTests(Repo):
    def test_1_prose_files_report_nothing(self):
        self.change({
            "docs/a.md": "Use `@pytest.mark.skip` sparingly. TODO: write more.\n",
            "docs/b.txt": "it.skip( is how mocha skips; raise NotImplementedError\n",
            "docs/c.rst": "xit( and FIXME\n",
            "docs/d.adoc": "t.Skip( and TODO\n",
        })
        r = self.review()
        self.assertEqual(findings(r, "blocker"), [], r.stdout)
        self.assertEqual(findings(r, "should-fix"), [], r.stdout)

    def test_2_markers_inside_string_literals_report_nothing(self):
        self.change({
            "src/patterns.py": (
                "SKIP = r\"@pytest\\.mark\\.skip|\\.skip\\(\"\n"
                "NOTE = 'remember the TODO list'\n"
                "FIXTURE = {\"a_test.py\": \"@unittest.skip('x')\\ndef test_a(): pass\"}\n"
            ),
            "web/messages.js": "export const hint = \"call it.skip( to skip\";\n",
        })
        r = self.review()
        self.assertEqual(findings(r, "blocker"), [], r.stdout)
        self.assertEqual(findings(r, "should-fix"), [], r.stdout)

    def test_3_lines_inside_an_added_triple_quoted_string_report_nothing(self):
        self.change({
            "src/doc.py": (
                'def f():\n'
                '    """Reports stubs:\n'
                '\n'
                '        should-fix  a stub added: TODO, FIXME, NotImplementedError\n'
                '        blocker     @pytest.mark.skip added\n'
                '    """\n'
                '    return 1\n'
            ),
        })
        r = self.review()
        self.assertEqual(findings(r, "blocker"), [], r.stdout)
        self.assertEqual(findings(r, "should-fix"), [], r.stdout)

    def test_4_real_markers_still_report(self):
        self.change({
            "tests/app_test.py": BASE_FILES["tests/app_test.py"].replace(
                "def test_sum", "import pytest\n\n\n@pytest.mark.skip\ndef test_sum"
            ),
            "src/app.py": "def total(xs):\n    # TODO handle None\n    return sum(xs)\n",
        })
        r = self.review()
        self.assertTrue(any("tests/app_test.py" in l for l in findings(r, "blocker")), r.stdout)
        self.assertTrue(any("src/app.py:2" in l for l in findings(r, "should-fix")), r.stdout)

    def test_5_a_likely_rename_is_should_fix_naming_both(self):
        self.change({"tests/app_test.py": BASE_FILES["tests/app_test.py"].replace("def test_sum", "def test_sum_of_two")})
        r = self.review()
        self.assertEqual(findings(r, "blocker"), [], r.stdout)
        rename = [l for l in findings(r, "should-fix") if "tests/app_test.py" in l]
        self.assertTrue(rename, r.stdout)
        self.assertIn("test_sum", rename[0])
        self.assertIn("test_sum_of_two", rename[0])

    def test_6_a_removal_with_no_added_test_is_still_a_blocker(self):
        self.change({"tests/app_test.py": "from src.app import total\n\n\ndef test_empty():\n    assert total([]) == 0\n"})
        r = self.review()
        self.assertTrue(any("test_sum" in l for l in findings(r, "blocker")), r.stdout)


if __name__ == "__main__":
    unittest.main()
