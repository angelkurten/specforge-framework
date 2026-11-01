#!/usr/bin/env python3
"""Fix round of specforge/changes/2026-11-01-retired-tests (review should-fixes):
scenarios 7-11. The contract is read from git at HEAD, an entry added after the
contract's first version in the range is flagged, a bullet inside an HTML comment
retires nothing, a whole-file entry reports every removed function, and the
template names the exact bullet form.

    python3 scripts/retired_tests_fix_test.py          # from the specforge directory
"""

import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import review_test  # noqa: E402
import retired_tests_test as base  # noqa: E402

CHANGE = review_test.CHANGE
DASH = base.DASH


class RetiredFix(review_test.Repo):
    def lines(self, r, severity):
        return [l for l in r.stdout.splitlines() if l.startswith(f"{severity}: ")]

    def test_7_an_uncommitted_bullet_retires_nothing(self):
        # Fails against reading contract.md from the working tree.
        self.change(deletes=["tests/other_test.py"])
        self.write(f"{CHANGE}/contract.md", base.contract(f"tests/other_test.py{DASH}added but never committed"))
        r = self.review()
        self.assertTrue(any("tests/other_test.py:1" in l and "test file deleted" in l for l in self.lines(r, "blocker")), r.stdout)

    def test_8_an_entry_added_after_the_contracts_first_version_is_flagged(self):
        # The contract is created inside the range, then a later commit adds a second entry.
        self.git("rm", "-q", f"{CHANGE}/contract.md")
        self.git("commit", "-q", "-m", "no contract at base")
        self.base = self.git("rev-parse", "HEAD").strip()
        self.write(f"{CHANGE}/contract.md", base.contract(f"tests/other_test.py{DASH}approved with the contract"))
        self.git("add", "-A")
        self.git("commit", "-q", "-m", "contract")
        self.change({f"{CHANGE}/contract.md": base.contract(
            f"tests/other_test.py{DASH}approved with the contract",
            f"tests/app_test.py{DASH}slipped in later")}, deletes=["tests/other_test.py", "tests/app_test.py"])
        r = self.review()
        flagged = [l for l in self.lines(r, "should-fix") if "added after the contract's first version" in l]
        # Fails against trusting every bullet at HEAD: the later one is not what the human approved.
        self.assertEqual(len(flagged), 1, r.stdout)
        self.assertIn("tests/app_test.py", flagged[0])
        self.assertTrue(any("tests/other_test.py:1" in l and "retired by the contract" in l for l in self.lines(r, "should-fix")))

    def test_9_a_bullet_inside_an_html_comment_retires_nothing(self):
        text = "# Demo\n\n**Mode**: Contract\n\n## Retired tests\n\n<!--\n- tests/other_test.py" + DASH + "only an example\n-->\n"
        self.change({f"{CHANGE}/contract.md": text}, deletes=["tests/other_test.py"])
        r = self.review()
        # Fails against reading bullets without removing <!-- --> comments first.
        self.assertTrue(any("tests/other_test.py:1" in l and "test file deleted" in l for l in self.lines(r, "blocker")), r.stdout)

    def test_10_a_whole_file_entry_reports_every_removed_function(self):
        self.change({f"{CHANGE}/contract.md": base.contract(f"tests/app_test.py{DASH}the module is retired"),
                     "tests/app_test.py": "from src.app import total\n"})
        r = self.review()
        retired = [l for l in self.lines(r, "should-fix") if "retired by the contract" in l]
        # Fails against dropping the removed-function finding instead of downgrading it.
        for name in ("test_empty", "test_sum"):
            self.assertTrue(any(name in l for l in retired), (name, r.stdout))


class TemplateForm(unittest.TestCase):
    def test_11_the_template_names_the_exact_bullet_form(self):
        text = (base.REPO / "templates" / "contract.md").read_text()
        part = text[text.index("## Retired tests"):]
        part = part[:part.index("\n## ", 1)]
        self.assertRegex(part, r"`- `")
        self.assertRegex(part.lower(), r"no backticks|bare path|without backticks")


if __name__ == "__main__":
    unittest.main(verbosity=2)
