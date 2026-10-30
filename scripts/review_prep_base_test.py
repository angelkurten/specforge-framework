#!/usr/bin/env python3
"""Edge test, Direct mode: review_prep.py with a --base that is not a commit exits 2
with a usage error naming the ref, as --repo-base already does, instead of a traceback.

    python3 scripts/review_prep_base_test.py          # from the specforge directory
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import review_test  # noqa: E402


class BaseRef(review_test.Repo):
    def test_a_missing_or_non_commit_base_is_a_usage_error(self):
        for ref in ("no-such-ref", "", "HEAD:src"):
            self.base = ref
            r = self.review()
            self.assertEqual(r.returncode, 2, (ref, r.stderr[-300:]))
            self.assertIn("--base", r.stderr, ref)
            self.assertNotIn("Traceback", r.stderr, ref)

    def test_a_valid_base_still_works(self):
        self.write(f"{review_test.CHANGE}/evidence.md", review_test.EVIDENCE)
        self.git("add", "-A")
        self.git("commit", "-q", "-m", "e")
        self.assertNotIn("Traceback", self.review().stderr)


if __name__ == "__main__":
    unittest.main(verbosity=2)
