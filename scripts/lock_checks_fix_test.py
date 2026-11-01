#!/usr/bin/env python3
"""Fix round of specforge/changes/2026-10-30-lock-checks (review should-fix): scenario 6.
A test that is not valid UTF-8 is approved as before the change, unless its decodable
part holds an invisible character. Bytes are built with escapes, never literally.

    python3 scripts/lock_checks_fix_test.py          # from the specforge directory
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import lock_checks_test as base  # noqa: E402

RLO_UTF8 = chr(0x202E).encode("utf-8")


class NotUtf8(base.Approve):
    test_1_an_invisible_character_is_refused_and_zwj_is_allowed = None
    test_2_one_bad_file_refuses_the_whole_approval = None

    def test_6_a_file_that_is_not_utf8_is_approved_unless_it_holds_an_invisible_character(self):
        (self.root / "tests").mkdir(exist_ok=True)
        (self.root / "tests/latin_test.py").write_bytes(b"def test_l():\n    assert b'\xe9'\n")
        r = self.run_approve("tests/latin_test.py")
        # Fails against decoding strictly: an uncaught UnicodeDecodeError, exit 1, no lock.
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertNotIn("Traceback", r.stderr)
        self.assertIn(b"tests/latin_test.py", self.lock_bytes() or b"")
        (self.root / "tests/mixed_test.py").write_bytes(b"def test_m():\n    assert b'\xe9'\n    x = '" + RLO_UTF8 + b"'\n")
        before = self.lock_bytes()
        r = self.run_approve("tests/mixed_test.py")
        self.assertEqual(r.returncode, 1, r.stdout + r.stderr)
        self.assertIn("tests/mixed_test.py:3", r.stdout + r.stderr)
        self.assertIn("U+202E", r.stdout + r.stderr)
        self.assertEqual(self.lock_bytes(), before)


if __name__ == "__main__":
    unittest.main(verbosity=2)
