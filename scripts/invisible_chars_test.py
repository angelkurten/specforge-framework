#!/usr/bin/env python3
"""Tests for the literal invisible-character finding in specforge/scripts/review_prep.py.

    python3 scripts/invisible_chars_test.py          # from the specforge directory

One test per acceptance scenario in
specforge/changes/2026-10-25-invisible-chars/contract.md, numbered the same way.
Every invisible character is built with chr(), so this file carries none.
Reuses the fixture from scripts/review_test.py.
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from review_test import PREP, Repo  # noqa: E402

RLO, ZWSP, BOM, TAG_A, ZWJ, ZWNJ, LSEP = (chr(c) for c in (0x202E, 0x200B, 0xFEFF, 0xE0041, 0x200D, 0x200C, 0x2028))


class InvisibleCharTests(Repo):
    def findings(self, result):
        return [l for l in result.stdout.splitlines() if "invisible character" in l]

    def test_1_a_literal_rlo_in_code_is_should_fix_and_exits_0(self):
        self.change({"src/new.py": f'BAD = "a{RLO}b"\n'})
        r = self.review()
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertFinding(r, "should-fix", "src/new.py:1")
        self.assertIn("U+202E", "\n".join(self.findings(r)))

    def test_2_prose_is_checked_too(self):
        self.change({"docs/note.md": f"a title{RLO} here\n"})
        r = self.review()
        self.assertFinding(r, "should-fix", "docs/note.md:1")
        self.assertIn("U+202E", "\n".join(self.findings(r)))

    def test_3_other_format_characters_name_their_code_point(self):
        self.change({"src/a.py": f"x = 1  # {ZWSP}\n", "src/b.py": f"{BOM}y = 2\n", "src/c.py": f"z = 3  # {TAG_A}\n"})
        out = "\n".join(self.findings(self.review()))
        for where, point in (("src/a.py:1", "U+200B"), ("src/b.py:1", "U+FEFF"), ("src/c.py:1", "U+E0041")):
            self.assertIn(where, out)
            self.assertIn(point, out)

    def test_4_zwj_and_zwnj_are_not_reported(self):
        # Fails against reporting every character of category Cf: emoji and Persian need these two.
        coder = chr(0x1F469) + ZWJ + chr(0x1F4BB)
        persian = "می" + ZWNJ + "خواهم"
        self.change({"docs/ok.md": f"{coder} {persian}\n"})
        self.assertEqual(self.findings(self.review()), [])

    def test_5_an_escape_is_not_reported(self):
        self.change({"src/esc.py": 'GOOD = "a\\u202eb"\n'})
        self.assertEqual(self.findings(self.review()), [])

    def test_6_a_line_separator_is_reported(self):
        self.change({"docs/sep.md": f"one{LSEP}two\n"})
        out = "\n".join(self.findings(self.review()))
        self.assertIn("docs/sep.md", out)
        self.assertIn("U+2028", out)

    def test_7_the_docstring_names_the_finding(self):
        self.assertIn("invisible character", PREP.read_text().split('"""')[1])


if __name__ == "__main__":
    unittest.main()
