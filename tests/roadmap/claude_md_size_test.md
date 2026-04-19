# Test #24: CLAUDE.md line count

**Type**: conformance
**PRD reference**: [PRD-001 §9 row #24](../../001-product-roadmap.md#9-test-plan)

## What this verifies

§7.2 "Edits to existing files" constrains `CLAUDE.md` to stay under the line-count target specified in `framework-maintenance.md` (50 lines at time of PRD-001 authorship, with net +2 lines: 45 → 47). The target must be read from the rule file rather than hardcoded, so the test remains correct if the target changes. A failure here means `CLAUDE.md` has bloated past the framework's own discipline.

## Fixtures

Post-implementation state of:

- `/Users/usuario/specforge/CLAUDE.md`
- `/Users/usuario/specforge/.claude/rules/framework-maintenance.md` (source of the line-count target)

## Steps

1. Read `framework-maintenance.md` and locate the `CLAUDE.md` line-count target (e.g. the text "under 50 lines" or an equivalent numeric spec).
2. Extract the numeric target (e.g. 50).
3. Count the lines of `CLAUDE.md` (`wc -l`).
4. Compare the line count to the target.

## Pass criteria

- [ ] The target is extracted from `framework-maintenance.md` by pattern match (not hardcoded in the test).
- [ ] `CLAUDE.md` line count is less than or equal to the extracted target.
- [ ] `CLAUDE.md` line count is greater than or equal to 40 (sanity lower bound — if the file is suddenly tiny, something is wrong).
- [ ] `CLAUDE.md` contains the `ROADMAP.md` row in the mental-model table (regex or substring check — verifies the intended edit landed, not just that the file stayed small).
- [ ] `CLAUDE.md` contains a pointer to `roadmap.md` in the always-loaded rules list.

## Fail examples

- `CLAUDE.md` is 48 lines but missing the `roadmap.md` pointer — line count passes but the edit is incomplete.
- Target is hardcoded as `50` in the test — if `framework-maintenance.md` raises it to 60, this test stays incorrectly strict. Target must be read from the rule file.
- `CLAUDE.md` is 52 lines — over the stated 50-line target.
