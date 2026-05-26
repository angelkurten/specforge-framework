# PRD-002 Test #10: CLAUDE.md size preserved, no rule content added

**Type**: conformance
**PRD reference**: [PRD-002 §9 row #10](../../002-sdd-2026-framework-alignment.md#9-test-plan)

## What this verifies

PRD-002 must not add rule content to `CLAUDE.md` (per `framework-maintenance.md`). The only CLAUDE.md edit is the zero-net caption number "12" → "13".

## Fixtures

- `/Users/usuario/specforge/CLAUDE.md`
- `/Users/usuario/specforge/.claude/rules/framework-maintenance.md`

## Steps

1. Read the line target from `framework-maintenance.md` ("Target: under 50 lines"). Do not hardcode the number here.
2. Count the lines of `CLAUDE.md`.
3. Diff CLAUDE.md against its pre-PRD-002 state.

## Pass criteria

- [ ] `CLAUDE.md` line count is **strictly less than** the target read from `framework-maintenance.md` ("under 50 lines" means `< 50`, not `≤ 50`).
- [ ] The only PRD-002 change to `CLAUDE.md` is the invariant-count caption (no new mental-model row, no new rule, no new pointer).

## Fail examples

- A new bullet (e.g. an AgDR pointer or a mental-model row for AgDR) was added to `CLAUDE.md`, growing it.
- The caption edit changed the line count (it should be zero-net).
