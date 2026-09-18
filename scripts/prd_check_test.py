#!/usr/bin/env python3
"""Tests for scripts/prd-check.py.

    python3 scripts/prd_check_test.py          # from the specforge directory
    python3 -m unittest discover -s scripts -p 'prd_check_test.py'

Every check is exercised against a synthetic PRD written to a temp directory,
so nothing here depends on the state of the real corpus. The negative cases
matter more than the positive ones: a check that cannot be made to fire is a
check that reports clean for the wrong reason, which is the failure mode this
whole validator exists to remove.
"""

import importlib.util
import json
import subprocess
import sys
import tempfile
import textwrap
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
SCRIPT = HERE / "prd-check.py"
REPO = HERE.parent


def load_module():
    spec = importlib.util.spec_from_file_location("prd_check", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    # dataclasses resolves annotations through sys.modules on 3.9.
    sys.modules["prd_check"] = module
    spec.loader.exec_module(module)
    return module


pc = load_module()


GOOD = """\
# PRD-099: A synthetic PRD

**Status**: Draft
**Date**: 2026-09-17

## Impacted Projects

| Project | Impact |
|---------|--------|
| **specforge** | Adds a thing |

## 1. Problem Statement

Something is wrong.

## 2. Goals

- Fix it.

## 3. Non-Goals

- Everything else.

## 4. User Flows

```mermaid
sequenceDiagram
    A->>B: go
```

### 4.2 Error branches

| Branch | Status | Body |
|--------|--------|------|
| Malformed body | 400 | `{"error": "invalid_request"}` |

## 5. API

### 5.1 `POST /widgets`

| Status | Reason |
|--------|--------|
| 400 | Malformed body |

## 6. Data Model

```mermaid
erDiagram
    WIDGET {
        bigint id PK
    }
```

**Indexes**:

- `widgets_owner_id_idx` on `(owner_id)`

## 7. Architecture

One component.

## 8. Security

No new trust boundary.

## 9. Test Plan

| # | Test | Type | Description | Path |
|---|------|------|-------------|------|
| 1 | malformed body returns 400 | integration | POST /widgets rejects it | `../svc/tests/widgets_test.py` |
| 2 | `widgets_owner_id_idx` exists after migration | integration | | `../svc/tests/schema_test.py` |

## 10. Migration Plan

Ship it.

## 11. Open Questions

- [ ] None.

---

## Gate: Promotion to `Implemented`

```yaml
commit_hash: [TBD]
tests:
  - [TBD]
system_artifact_diff:
  - [TBD]
```
"""

SIBLINGS = """\
# SIBLINGS

## Registry

| Project | Path | Read first | Stack | Status |
|---|---|---|---|---|
| **specforge** | `.` | `CLAUDE.md` | Markdown | active |
"""


class Harness(unittest.TestCase):
    """Writes a PRD into a throwaway tree and runs the checks over it."""

    def run_checks(self, body, siblings=SIBLINGS, extra=None):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "SIBLINGS.md").write_text(siblings, encoding="utf-8")
            for rel, text in (extra or {}).items():
                target = root / rel
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(text, encoding="utf-8")
            prd = root / "099-synthetic.md"
            prd.write_text(body, encoding="utf-8")
            return pc.check_file(prd, root)

    def checks(self, findings):
        return sorted({f.check for f in findings})

    def of(self, findings, check):
        return [f for f in findings if f.check == check]


class TestCleanDocument(Harness):
    def test_a_well_formed_prd_reports_nothing(self):
        findings = self.run_checks(GOOD)
        self.assertEqual(findings, [], "\n".join(
            f"{f.check} {f.anchor()}: {f.message}" for f in findings))


class TestRequiredSections(Harness):
    def test_a_missing_numbered_section_reports(self):
        body = GOOD.replace("## 6. Data Model", "## 6bis. Data Model")
        found = self.of(self.run_checks(body), "sections")
        self.assertTrue(any("missing section 6" in f.message for f in found), found)

    def test_a_missing_gate_heading_reports(self):
        body = GOOD.replace("## Gate: Promotion to `Implemented`", "## Wrap-up")
        found = self.of(self.run_checks(body), "sections")
        self.assertTrue(any("Gate" in f.message for f in found), found)

    def test_sections_out_of_order_report(self):
        head, tail = GOOD.split("## 2. Goals\n\n- Fix it.\n\n", 1)
        body = head + tail.replace("## 3. Non-Goals\n\n- Everything else.\n\n",
                                   "## 3. Non-Goals\n\n- Everything else.\n\n"
                                   "## 2. Goals\n\n- Fix it.\n\n")
        found = self.of(self.run_checks(body), "sections")
        self.assertTrue(any("before" in f.message for f in found), found)

    def test_headings_inside_a_fence_are_not_sections(self):
        body = GOOD.replace("## 7. Architecture\n\nOne component.",
                            "## 7. Architecture\n\n```markdown\n## 9. Test Plan\n```\n")
        # The fenced "## 9." must not satisfy section 9, nor displace the real one.
        found = self.of(self.run_checks(body), "sections")
        self.assertEqual(found, [], [f.message for f in found])


class TestSiblings(Harness):
    def test_an_unregistered_project_reports(self):
        body = GOOD.replace("| **specforge** | Adds a thing |",
                            "| **api-service** | Adds a thing |")
        found = self.of(self.run_checks(body), "siblings")
        self.assertEqual(len(found), 1, found)
        self.assertIn("api-service", found[0].message)

    def test_the_match_is_character_for_character(self):
        body = GOOD.replace("| **specforge** | Adds a thing |",
                            "| **Specforge** | Adds a thing |")
        self.assertEqual(len(self.of(self.run_checks(body), "siblings")), 1)


class TestGateBlock(Harness):
    def test_a_bare_scalar_tests_field_reports(self):
        body = GOOD.replace("tests:\n  - [TBD]", "tests: ../svc/tests/widgets_test.py")
        found = self.of(self.run_checks(body), "gate")
        self.assertTrue(any("bare scalar" in f.message for f in found), found)

    def test_a_missing_field_reports(self):
        body = GOOD.replace("system_artifact_diff:\n  - [TBD]\n", "")
        found = self.of(self.run_checks(body), "gate")
        self.assertTrue(any("system_artifact_diff" in f.message for f in found), found)

    def test_tbd_is_illegal_once_implemented(self):
        body = GOOD.replace("**Status**: Draft", "**Status**: Implemented")
        found = self.of(self.run_checks(body), "gate")
        self.assertTrue(any("[TBD]" in f.message for f in found), found)
        self.assertTrue(any("commit_hash" in f.message for f in found), found)

    def test_an_implemented_prd_with_all_three_filled_is_clean(self):
        body = (GOOD
                .replace("**Status**: Draft", "**Status**: Implemented")
                .replace("commit_hash: [TBD]", "commit_hash: a1b2c3d4")
                .replace("tests:\n  - [TBD]",
                         "tests:\n  - ../svc/tests/widgets_test.py\n"
                         "  - ../svc/tests/schema_test.py")
                .replace("system_artifact_diff:\n  - [TBD]",
                         "system_artifact_diff: []"))
        found = self.of(self.run_checks(body), "gate")
        self.assertEqual(found, [], [f.message for f in found])

    def test_a_multi_line_html_comment_above_the_fence_is_skipped(self):
        body = GOOD.replace(
            "## Gate: Promotion to `Implemented`\n\n```yaml",
            "## Gate: Promotion to `Implemented`\n\n"
            "<!-- validation: three paths,\n     all clean,\n     no waiver. -->\n\n```yaml")
        self.assertEqual(self.of(self.run_checks(body), "gate"), [])

    def test_a_bare_hash_line_above_the_fence_reports(self):
        body = GOOD.replace(
            "## Gate: Promotion to `Implemented`\n\n```yaml",
            "## Gate: Promotion to `Implemented`\n\n# yellow-tracking: PRD-099\n\n```yaml")
        found = self.of(self.run_checks(body), "gate")
        self.assertTrue(any("yaml fence" in f.message for f in found), found)


class TestGateTestsJoin(Harness):
    def filled(self, tests_yaml):
        return (GOOD
                .replace("**Status**: Draft", "**Status**: Implemented")
                .replace("commit_hash: [TBD]", "commit_hash: a1b2c3d4")
                .replace("tests:\n  - [TBD]", tests_yaml)
                .replace("system_artifact_diff:\n  - [TBD]", "system_artifact_diff: []"))

    def test_equal_sets_report_nothing(self):
        body = self.filled("tests:\n  - ../svc/tests/widgets_test.py\n"
                           "  - ../svc/tests/schema_test.py")
        self.assertEqual(self.of(self.run_checks(body), "gate-tests"), [])

    def test_a_gate_path_absent_from_section_9_reports(self):
        body = self.filled("tests:\n  - ../svc/tests/widgets_test.py\n"
                           "  - ../svc/tests/schema_test.py\n  - ../svc/tests/ghost_test.py")
        found = self.of(self.run_checks(body), "gate-tests")
        self.assertTrue(any("ghost_test" in f.message for f in found), found)

    def test_a_section_9_path_absent_from_the_gate_reports(self):
        body = self.filled("tests:\n  - ../svc/tests/widgets_test.py")
        found = self.of(self.run_checks(body), "gate-tests")
        self.assertTrue(any("schema_test" in f.message for f in found), found)

    def test_a_tbd_gate_is_skipped(self):
        self.assertEqual(self.of(self.run_checks(GOOD), "gate-tests"), [])

    def test_a_pipe_inside_a_code_span_does_not_shift_the_path_column(self):
        body = GOOD.replace(
            "| 1 | malformed body returns 400 | integration | POST /widgets rejects it |",
            "| 1 | malformed body returns 400 | integration | matches `/a|b/` and rejects |")
        paths = [p for _, p in pc.section9_paths(self._doc(body))]
        self.assertIn("../svc/tests/widgets_test.py", paths)

    def _doc(self, body):
        with tempfile.TemporaryDirectory() as tmp:
            prd = Path(tmp) / "099-synthetic.md"
            prd.write_text(body, encoding="utf-8")
            return pc.load(prd)


class TestCoverageJoin(Harness):
    def test_an_error_branch_with_no_test_row_reports(self):
        body = GOOD.replace("| Malformed body | 400 | `{\"error\": \"invalid_request\"}` |",
                            "| Malformed body | 400 | `{\"error\": \"invalid_request\"}` |\n"
                            "| Quota exhausted | 429 | `{\"error\": \"quota\"}` |")
        found = self.of(self.run_checks(body), "coverage")
        self.assertTrue(any("Quota exhausted" in f.message for f in found), found)

    def test_an_error_status_with_no_test_row_reports(self):
        body = GOOD.replace("| 400 | Malformed body |",
                            "| 400 | Malformed body |\n| 503 | Upstream down |")
        found = self.of(self.run_checks(body), "coverage")
        self.assertTrue(any("503" in f.message for f in found), found)

    def test_a_named_constraint_with_no_test_row_reports(self):
        body = GOOD.replace("- `widgets_owner_id_idx` on `(owner_id)`",
                            "- `widgets_owner_id_idx` on `(owner_id)`\n"
                            "- `widgets_slug_key` unique on `(slug)`")
        found = self.of(self.run_checks(body), "coverage")
        self.assertTrue(any("widgets_slug_key" in f.message for f in found), found)

    def test_a_covered_obligation_stays_silent(self):
        self.assertEqual(self.of(self.run_checks(GOOD), "coverage"), [])

    def test_the_report_names_the_closest_row(self):
        body = GOOD.replace("| 400 | Malformed body |",
                            "| 400 | Malformed body |\n| 503 | Upstream down |")
        found = [f for f in self.of(self.run_checks(body), "coverage")
                 if "503" in f.message]
        self.assertTrue(found[0].detail.startswith("closest row is line "), found[0].detail)


class TestCitations(Harness):
    def test_a_citation_to_a_missing_file_reports(self):
        body = GOOD.replace("Something is wrong.", "Something is wrong (`src/ghost.ts:12`).")
        found = self.of(self.run_checks(body), "citations")
        self.assertEqual(len(found), 1, found)
        self.assertIn("ghost.ts:12", found[0].message)

    def test_a_citation_past_the_end_of_the_file_reports(self):
        body = GOOD.replace("Something is wrong.", "Something is wrong (`src/real.ts:400`).")
        found = self.of(self.run_checks(body, extra={"src/real.ts": "a\nb\nc\n"}), "citations")
        self.assertEqual(len(found), 1, found)
        self.assertIn("3 lines", found[0].message)

    def test_a_resolvable_citation_is_silent(self):
        body = GOOD.replace("Something is wrong.", "Something is wrong (`src/real.ts:2`).")
        self.assertEqual(
            self.of(self.run_checks(body, extra={"src/real.ts": "a\nb\nc\n"}), "citations"), [])

    def test_a_bare_basename_resolves_through_the_tree(self):
        body = GOOD.replace("Something is wrong.", "Something is wrong (`real.ts:2`).")
        self.assertEqual(
            self.of(self.run_checks(body, extra={"src/real.ts": "a\nb\nc\n"}), "citations"), [])


class TestMarketing(Harness):
    def test_a_forbidden_phrase_reports(self):
        body = GOOD.replace("Something is wrong.", "The current design is robust.")
        found = self.of(self.run_checks(body), "marketing")
        self.assertEqual(len(found), 1, found)

    def test_a_quoted_mention_is_not_a_use(self):
        body = GOOD.replace("Something is wrong.",
                            "Hard rule 9 forbids `robust` and \"seamless\".")
        self.assertEqual(self.of(self.run_checks(body), "marketing"), [])


class TestDiagrams(Harness):
    def test_ascii_box_art_reports(self):
        art = "```\n+--------+      +--------+\n| client |----->| server |\n+--------+      +--------+\n```"
        body = GOOD.replace("One component.", art)
        found = self.of(self.run_checks(body), "diagrams")
        self.assertTrue(any("ASCII art" in f.message for f in found), found)

    def test_a_file_layout_tree_is_not_a_diagram(self):
        tree = "```\nspecforge/\n├── CLAUDE.md\n└── templates/\n```"
        body = GOOD.replace("One component.", tree)
        self.assertEqual(
            [f for f in self.of(self.run_checks(body), "diagrams") if "ASCII" in f.message], [])

    def test_a_substantive_section_without_a_mermaid_fence_reports(self):
        filler = "\n".join(f"Paragraph line {n} carrying real design detail." for n in range(14))
        body = GOOD.replace("## 6. Data Model\n\n```mermaid\nerDiagram\n    WIDGET {\n"
                            "        bigint id PK\n    }\n```",
                            "## 6. Data Model\n\n" + filler)
        found = self.of(self.run_checks(body), "diagrams")
        self.assertTrue(any("section 6" in f.message for f in found), found)

    def test_a_section_declaring_no_surface_is_not_asked_for_a_diagram(self):
        filler = "\n".join(f"Paragraph line {n} explaining why there is nothing."
                           for n in range(14))
        body = GOOD.replace("## 6. Data Model\n\n```mermaid\nerDiagram\n    WIDGET {\n"
                            "        bigint id PK\n    }\n```",
                            "## 6. Data Model\n\nNo persisted schema changes.\n\n" + filler)
        found = [f for f in self.of(self.run_checks(body), "diagrams") if "section 6" in f.message]
        self.assertEqual(found, [])


class TestPropagationSpans(Harness):
    TABLE = ("\n| File(s) | Site | Current | Change |\n|---|---|---|---|\n"
             "| `target.md` | the span `{span}` | prose | reworded |\n")

    def test_a_span_occurring_once_is_silent(self):
        body = GOOD.replace("## 7. Architecture\n\nOne component.",
                            "## 7. Architecture\n\nOne component.\n"
                            + self.TABLE.format(span="the unique sentence"))
        found = self.of(self.run_checks(body, extra={"target.md": "a\nthe unique sentence\nb\n"}),
                        "spans")
        self.assertEqual(found, [])

    def test_a_span_occurring_twice_reports(self):
        body = GOOD.replace("## 7. Architecture\n\nOne component.",
                            "## 7. Architecture\n\nOne component.\n"
                            + self.TABLE.format(span="repeated"))
        found = self.of(self.run_checks(body, extra={"target.md": "repeated\nrepeated\n"}), "spans")
        self.assertEqual(len(found), 1, found)
        self.assertIn("occurs 2 times", found[0].message)

    def test_a_span_occurring_never_reports(self):
        body = GOOD.replace("## 7. Architecture\n\nOne component.",
                            "## 7. Architecture\n\nOne component.\n"
                            + self.TABLE.format(span="absent"))
        found = self.of(self.run_checks(body, extra={"target.md": "nothing here\n"}), "spans")
        self.assertIn("occurs 0 times", found[0].message)

    def test_a_named_structural_unit_is_not_checked(self):
        table = ("\n| File(s) | Site | Current | Change |\n|---|---|---|---|\n"
                 "| `target.md` | rule 7 | prose | reworded |\n")
        body = GOOD.replace("## 7. Architecture\n\nOne component.",
                            "## 7. Architecture\n\nOne component.\n" + table)
        self.assertEqual(self.of(self.run_checks(body, extra={"target.md": "x\n"}), "spans"), [])

    def test_a_line_number_anchor_reports(self):
        table = ("\n| File(s) | Site | Current | Change |\n|---|---|---|---|\n"
                 "| `target.md` | line 42 | prose | reworded |\n")
        body = GOOD.replace("## 7. Architecture\n\nOne component.",
                            "## 7. Architecture\n\nOne component.\n" + table)
        found = self.of(self.run_checks(body, extra={"target.md": "x\n"}), "spans")
        self.assertTrue(any("line number" in f.message for f in found), found)


class TestAbsenceRows(Harness):
    def test_a_row_asserting_an_absence_reports(self):
        body = GOOD.replace("| 2 | `widgets_owner_id_idx` exists after migration | integration | |",
                            "| 2 | nothing is written to the audit log on a rejected request "
                            "| integration | |")
        found = self.of(self.run_checks(body), "absence")
        self.assertEqual(len(found), 1, found)

    def test_a_row_naming_what_it_fails_against_is_silent(self):
        body = GOOD.replace("| 2 | `widgets_owner_id_idx` exists after migration | integration | |",
                            "| 2 | nothing is written to the audit log on a rejected request "
                            "| integration | fails against an implementation that logs before "
                            "validating |")
        self.assertEqual(self.of(self.run_checks(body), "absence"), [])

    def test_a_positive_assertion_is_silent(self):
        self.assertEqual(self.of(self.run_checks(GOOD), "absence"), [])


class TestNonPrdDocuments(Harness):
    """An ADR numbers its own sections 1-7; PRD checks must not rain on it."""

    def run_named(self, name, body):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "SIBLINGS.md").write_text(SIBLINGS, encoding="utf-8")
            target = root / name
            target.write_text(body, encoding="utf-8")
            return pc.check_file(target, root)

    ADR = ("# ADR-001: A decision\n\n**Status**: Accepted\n\n"
           "## 1. Context\n\nx\n\n## 2. Decision\n\nx\n\n"
           "## 3. Alternatives Considered\n\nx\n\n## 4. Consequences\n\nx\n\n"
           "## 5. Trade-offs Accepted\n\nx\n\n## 6. Signals to Reconsider\n\nx\n\n"
           "## 7. Cost to Reverse\n\nx\n")

    def test_an_adr_gets_one_finding_not_eleven(self):
        findings = self.run_named("ADR-001-a-decision.md", self.ADR)
        self.assertEqual(len(findings), 1, [f.message for f in findings])
        self.assertIn("not PRD-shaped", findings[0].message)

    def test_an_agdr_is_recognised_too(self):
        findings = self.run_named("AgDR-001-a-choice.md", self.ADR)
        self.assertEqual(len(findings), 1, [f.message for f in findings])

    def test_a_prd_shaped_file_is_still_checked(self):
        findings = self.run_named("099-synthetic.md", GOOD)
        self.assertEqual(findings, [], [f.message for f in findings])


class TestCommandLine(unittest.TestCase):
    def run_cli(self, *args):
        return subprocess.run(
            [sys.executable, str(SCRIPT), *args],
            capture_output=True, text=True, cwd=str(REPO))

    def test_a_clean_file_exits_zero(self):
        with tempfile.TemporaryDirectory() as tmp:
            prd = Path(tmp) / "099-synthetic.md"
            prd.write_text(GOOD, encoding="utf-8")
            # Run from the repo root so SIBLINGS.md resolves to the real registry;
            # the synthetic PRD cites `specforge`, which that registry holds.
            result = self.run_cli(str(prd))
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("clean.", result.stdout)

    def test_a_dirty_file_exits_one(self):
        result = self.run_cli(str(REPO / "tools/cli/framework/examples/prd-001-login-example.md"))
        self.assertEqual(result.returncode, 1, result.stdout[:400])

    def test_json_mode_emits_the_same_findings(self):
        target = str(REPO / "tools/cli/framework/examples/prd-001-login-example.md")
        text = self.run_cli(target)
        payload = json.loads(self.run_cli("--json", target).stdout)
        self.assertEqual(payload["counts"]["total"],
                         payload["counts"]["blocker"] + payload["counts"]["look"])
        self.assertGreater(payload["counts"]["total"], 0)
        for finding in payload["findings"]:
            self.assertIn(finding["check"], pc.CHECK_TITLES)
            self.assertIn(finding["severity"], (pc.BLOCKER, pc.LOOK))
        self.assertIn("Coverage join", text.stdout)

    def test_a_missing_file_exits_two(self):
        result = self.run_cli("no-such-prd.md")
        self.assertEqual(result.returncode, 2)
        self.assertIn("no such file", result.stderr)

    def test_several_files_are_accepted(self):
        result = self.run_cli("--json", str(REPO / "013-propagation-table-line-drift.md"),
                              str(REPO / "014-bounding-the-in-place-correction.md"))
        payload = json.loads(result.stdout)
        self.assertEqual(len(payload["files"]), 2)


class TestInstalledByTheCli(unittest.TestCase):
    """The validator is worthless in an adopter's corpus if it does not ship."""

    def test_the_partition_lists_it_as_a_framework_file(self):
        partition = (REPO / "tools/cli/src/partition.ts").read_text(encoding="utf-8")
        framework = partition.split("FRAMEWORK_FILES", 1)[1].split("];", 1)[0]
        self.assertIn('"scripts/prd-check.py"', framework)

    def test_the_repo_scripts_directory_is_not_claimed_wholesale(self):
        partition = (REPO / "tools/cli/src/partition.ts").read_text(encoding="utf-8")
        framework = partition.split("FRAMEWORK_FILES", 1)[1].split("];", 1)[0]
        self.assertNotIn('"scripts/**"', framework)


if __name__ == "__main__":
    unittest.main(verbosity=2)
