# The design panel becomes the reviewer's design mode

**Mode**: Contract

```
MODE PROPOSAL
Risk: low — review prose only (specforge/core/review.md, the reviewer's definition, modes.md § Design panel, the migration guide); no script, schema or exit code, and it reverts as a unit
Uncertainty: low — the existing panel already names the three perspectives; the outcome is written as checkable text
Controlled flag: yes — DECISIONS.md 2026-10-29 puts retiring v1 in Controlled because of the external kubbo installation
Mode: Contract — the table needs high risk for Controlled; the human chose Contract, since this change touches nothing kubbo uses
```

Confirmed by the human, 2026-10-29, as change 2 of 5 in retiring v1 from the package. The plan was revised from 4 changes to 5: 1 `update` removes declared retired files (archived); 2 this change; 3 the file swap (a v2 `CLAUDE.md`, a short unscoped rule, v1 files out of the repo and the bundle); 4 v1 validators out of `doctor`; 5 release 1.0.0.

## Outcome

A high-risk Contract or Controlled change can still get a design review of its contract before Red, without v1's three reviewer agents. The lead dispatches `specforge-reviewer` with `Mode: design`, once per perspective: backend, security and quality. That frees change 3 to remove all 14 v1 agents.

## Scope

In:
- **`specforge/core/review.md`:** a new `## Design mode` section. It says:
  - when it runs: optional, before Red, for a high-risk change that touches design (schema, migration, an invariant across routes);
  - what the reviewer reads: the contract and the code it names, with no diff and no evidence;
  - the three perspectives, each with its own focus:
    - **backend**: the data model, migrations and rollback, public-contract compatibility, and invariants across routes;
    - **security**: the security checklist above;
    - **quality**: every Scope item has an Acceptance scenario that would fail without it, premises are checkable, and the edge checklist;
  - the report: the same shape as § Report, with `file:line` into the contract or the named code;
  - findings go into the contract before Red.
- **`.claude/agents/specforge/specforge-reviewer.md`:** with `Mode: design` and a `Perspective`, it reads § Design mode and the contract instead of a diff.
- **`specforge/core/modes.md` § Design panel:** rewritten to dispatch `specforge-reviewer` with `Mode: design` and a `Perspective`. It names no v1 agent.
- **`docs/migration-v1-to-v2.md`:** line 70's "v1's backend, security and quality reviewers on the contract" becomes the reviewer's design mode.
- **`scripts/v2_adjustments_test.py` test_3:** its needles name the three v1 agents and `REVIEW_MODE: draft`. They become `specforge-reviewer`, `Mode: design` and the three perspectives, and the same optional, high-risk and before-Red checks stay. The test is locked by archived change `2026-10-25-v2-adjustments`. The human approves this edit here; `review_prep` will report it as a foreign lock edit to confirm.
- `scripts/design_mode_test.py` (`new`), added to `v2-ci`.
- **`specforge/DECISIONS.md`:** an entry for the design mode and the 5-change plan.

Out:
- Removing any v1 agent file; that is change 3.
- A design report format different from § Report.

## Context

- `specforge/core/modes.md` § Design panel (the last section).
- `specforge/core/review.md`: § Report (line 39), the security checklist (line 19), the edge checklist (line 29).
- `.claude/agents/specforge/specforge-reviewer.md`, steps 1-4.
- `scripts/v2_adjustments_test.py` test_3 (line 42); `scripts/migration_guide_fix_test.py` test_12 (line 58) still needs "design panel" in the guide.

## Constraints

- `review.md` stays one rule file the reviewer reads whole; the new section stays under 25 lines.
- No test in `v2-ci.yml` other than test_3 changes. All 48 suites pass, 49 after the fix round (corrected at compose).

## Premises

- No design mode exists yet — `grep -c "Mode: design" specforge/core/review.md` → holds
- Only modes.md, DECISIONS.md, the guide, its fix test, v2_adjustments_test and this contract name the panel outside the archive — `grep -rl "esign panel" specforge .claude/skills scripts docs templates README.md` → holds

## Acceptance evidence

`python3 scripts/design_mode_test.py`, `python3 scripts/v2_adjustments_test.py` and every suite in `v2-ci.yml` pass:

1. `review.md` has `## Design mode`. It names `Mode: design`, the three perspectives, "before Red", that the reviewer reads the contract and the code it names but no diff, and that the report follows § Report.
2. In that section, each perspective names its focus: backend names migration and rollback, security names the security checklist, and quality names Acceptance and the edge checklist.
3. `specforge-reviewer.md` names `Mode: design`, `Perspective` and § Design mode.
4. `modes.md` § Design panel names `specforge-reviewer`, `Mode: design`, the three perspectives, optional, high risk and before Red. It names none of `specforge-backend-reviewer`, `specforge-security-reviewer`, `specforge-quality-reviewer` or `REVIEW_MODE`.
5. The migration guide names the design mode and no longer says "v1's backend, security and quality reviewers".
6. `DECISIONS.md` has an entry on the design mode that names the 5-change plan.

Fix round, after review (PASS, two should-fix and two nits), in `scripts/design_mode_fix_test.py` (`new`):

7. `modes.md` § Design panel and `review.md` § Design mode name the `Contract:` field the dispatch carries.
8. The reviewer's step 3 lets a `Mode: design` review run the contract's Premise commands and read the named code at a ref, read-only.
9. `review.md`'s opening paragraph names both moments: after the loop, and the design mode before Red.
10. § Design mode says that `CHECKED` lists the perspective's items.

`v2-ci` and `cli-ci` pass on the last code commit.

## Approvals

- Mode Contract (not Controlled): the human, 2026-10-29.
- The red tests in `scripts/design_mode_test.py`, approved and locked: the human, 2026-10-29.
- The lead's edit to `scripts/v2_adjustments_test.py` test_3, made before the loop: the human, 2026-10-29. That test is locked by `2026-10-25-v2-adjustments`.

- Fix round after review, with its test `scripts/design_mode_fix_test.py` approved and locked: the human, 2026-10-29. The test_3 edit the packet reports is the one already approved above.

## Stop and escalate

Stop and ask if another locked test must change, or if the design mode needs its own report shape. Budget: 8 iterations, 3 USD, for 8 tasks (6 scenarios, test_3, the full suites). Raised by the human to 12 iterations, 4 USD, cumulative, for the fix round's 3 tasks.
