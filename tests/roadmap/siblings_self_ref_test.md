# Test #23: Self-reference resolves

**Type**: conformance
**PRD reference**: [PRD-001 §9 row #23](../../001-product-roadmap.md#9-test-plan)

## What this verifies

Hard rule 11 requires every `Impacted Projects` row to match a row name in `SIBLINGS.md`. PRD-001 impacts the `specforge` sibling itself, so `SIBLINGS.md` must gain a self-reference row (path `.`) and the workflow step-2 path precondition must succeed for that row. A failure here blocks the entire PRD from being authorable at all.

## Fixtures

Post-implementation state of:

- `/Users/usuario/specforge/SIBLINGS.md` (expected to contain a `specforge` row).
- `/Users/usuario/specforge/001-product-roadmap.md` (header `Impacted Projects` table).

## Steps

1. Read `SIBLINGS.md` and locate the `specforge` row.
2. Read PRD-001's `Impacted Projects` table header row.
3. Simulate the workflow step-2 path check: verify the path recorded in the `specforge` row resolves on disk from the specforge directory.

## Pass criteria

- [ ] `SIBLINGS.md` contains a row named `specforge` with `Path: .` (or an equivalent representation of the current directory).
- [ ] The `specforge` row declares `Read first: CLAUDE.md` (or equivalent read-first instruction per §7.2).
- [ ] The `specforge` row has `Status: active`.
- [ ] Path resolution: `.` resolves to the specforge repo root (the directory containing `SIBLINGS.md` itself). The step-2 path check returns success.
- [ ] PRD-001's `Impacted Projects` table contains a row whose `Project` column equals `specforge` verbatim (matching the `SIBLINGS.md` row name).
- [ ] The `specforge` entry in PRD-001's table is bolded as the primary project (per `prd-authoring.md` header rules).

## Fail examples

- `SIBLINGS.md` does not contain a `specforge` row — hard rule 11 fails for PRD-001.
- Row name is `specforge-framework` but PRD-001 cites `specforge` — name must match verbatim.
- `Path:` is the absolute path `/Users/usuario/specforge` — paths in the registry must be relative (`.`) to be portable.
