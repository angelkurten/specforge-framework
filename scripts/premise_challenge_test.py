#!/usr/bin/env python3
"""Tests for the premise challenge: a contract's premises are checked before the loop runs.

    python3 scripts/premise_challenge_test.py          # from the specforge directory

One test per acceptance scenario in
specforge/changes/2026-10-24-premise-challenge/contract.md, numbered the same
way. Reuses the fixture from scripts/archive_test.py: a git repository holding
one change whose test tests/demo_test.py is locked.
"""

import subprocess
import sys
import textwrap
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from archive_test import CHANGE, LOOP, REPO, Repo  # noqa: E402

TEMPLATE = REPO / "templates" / "contract.md"
LOOP_RULE = REPO / "specforge" / "core" / "loop.md"

HEAD = "# Demo\n\n**Mode**: Contract\n\n## Outcome\n\nSomething.\n\n"
HOLDS = HEAD + "## Premises\n\n- The fixture repo exists — `git status` → holds\n\n## Acceptance evidence\n\n1. It works.\n"
NONE = HEAD + "## Premises\n\n- none — the change rests on nothing it has not already run\n\n## Acceptance evidence\n\n1. It works.\n"
NO_SECTION = HEAD + "## Acceptance evidence\n\n1. It works.\n"
UNCHECKED = HEAD + "## Premises\n\n- The cache is never shared across tenants — `grep -rn cache src/`\n\n## Acceptance evidence\n\n1. It works.\n"
FAILED = HEAD + "## Premises\n\n- The cache is never shared across tenants — `grep -rn cache src/` → fails: src/cache.py:12 keys by user only\n\n## Acceptance evidence\n\n1. It works.\n"


class PremiseChallengeTests(Repo):
    def run_loop(self, contract, agent_body='Path(MARKER).write_text("ran")\n'):
        self.write(f"{CHANGE}/contract.md", contract)
        self.marker = self.root / "agent-ran"
        agent = self.root / "fake_agent.py"
        agent.write_text(
            "import sys\nfrom pathlib import Path\n"
            f"MARKER = {str(self.marker)!r}\n" + textwrap.dedent(agent_body)
        )
        return subprocess.run(
            [sys.executable, str(LOOP), CHANGE, "--max-iterations", "1", "--agent", f"{sys.executable} {agent}"],
            cwd=self.root, capture_output=True, text=True,
        )

    def assertRefused(self, r):
        self.assertEqual(r.returncode, 2, r.stdout + r.stderr)
        self.assertFalse(self.marker.exists(), "the agent ran although the premises were not checked")

    def test_1_the_template_has_a_premises_section(self):
        text = TEMPLATE.read_text()
        constraints, premises, acceptance = (text.find(h) for h in ("## Constraints", "## Premises", "## Acceptance evidence"))
        self.assertTrue(-1 < constraints < premises < acceptance, (constraints, premises, acceptance))
        section = text[premises:acceptance]
        for form in ("→ holds", "→ fails:", "- none"):
            self.assertIn(form, section)

    def test_2_no_premises_section_does_not_start(self):
        r = self.run_loop(NO_SECTION)
        self.assertRefused(r)
        self.assertIn("Premises", r.stdout + r.stderr)

    def test_3_an_unchecked_premise_does_not_start(self):
        r = self.run_loop(UNCHECKED)
        self.assertRefused(r)
        self.assertIn("The cache is never shared across tenants", r.stdout + r.stderr)

    def test_4_a_failed_premise_does_not_start_and_says_reclassify(self):
        r = self.run_loop(FAILED)
        self.assertRefused(r)
        self.assertIn("classif", (r.stdout + r.stderr).lower())

    def test_5_checked_premises_start_the_loop(self):
        # Fails against an implementation that refuses every contract: both
        # forms must reach the agent, which then hits the 1-iteration cap.
        for contract in (HOLDS, NONE):
            r = self.run_loop(contract)
            self.assertTrue(self.marker.exists(), r.stdout + r.stderr)
            self.assertEqual(r.returncode, 3, r.stdout + r.stderr)
            self.marker.unlink()

    def test_6_the_loop_rule_lists_challenge_before_red(self):
        text = LOOP_RULE.read_text()
        phases = text[text.find("## Phases"):]
        self.assertTrue(-1 < phases.find("**Challenge.**") < phases.find("**Red.**"), phases[:400])

    def test_7_a_failing_agent_shows_its_stderr(self):
        r = self.run_loop(HOLDS, agent_body='print("boom-from-the-agent", file=sys.stderr)\nsys.exit(1)\n')
        self.assertIn("boom-from-the-agent", r.stdout + r.stderr)


if __name__ == "__main__":
    unittest.main()
