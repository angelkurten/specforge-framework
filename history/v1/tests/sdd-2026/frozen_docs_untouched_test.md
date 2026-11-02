# PRD-002 Test #11: Frozen documents and team data untouched

**Type**: conformance
**PRD reference**: [PRD-002 §9 row #11](../../002-sdd-2026-framework-alignment.md#9-test-plan)

## What this verifies

PRD-002 edits framework files only. Hard rule 7 (frozen snapshots) and the § 10 Migration Plan require that no existing frozen PRD/ADR or team-data file is modified. The one permitted exception among pre-existing files is the living test artifact `tests/roadmap/hard_rules_12_test.md`, whose count guard PRD-002 revises.

## Fixtures

- The implementation commit referenced by the gate block's `commit_hash`.

## Steps

1. Run `git diff --name-only <commit_hash>` (or the merge range) scoped to the specforge repo.
2. Partition the changed paths into: new files, framework-file edits, and pre-existing non-framework edits.

## Pass criteria

- [ ] No edit to `001-product-roadmap.md` or any `ADR-[0-9][0-9][0-9]-*.md`.
- [ ] No edit to team data (`SIBLINGS.md`, any `[0-9][0-9][0-9]-*.md` other than the new `002-*.md`, `ROADMAP.md`).
- [ ] Among pre-existing files, the only edits are to framework files (`.claude/rules/*`, `CONVENTIONS.md`, `CLAUDE.md`, `README.md`, `README.es.md`, `docs/faq.md`, `CHANGELOG.md`, `templates/prd.md`) and to the living test artifact `tests/roadmap/hard_rules_12_test.md`.

## Fail examples

- `git diff` shows a change to `001-product-roadmap.md` — a frozen PRD was edited, violating hard rule 7.
- `SIBLINGS.md` was modified (team data touched by a framework change).
