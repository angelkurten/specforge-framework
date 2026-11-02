# Test #13: Retroactive escape — PRD without header

**Type**: conformance
**PRD reference**: [PRD-001 §9 row #13](../../001-product-roadmap.md#9-test-plan)

## What this verifies

§4.2 "else" branch: when a PRD without `Roadmap item:` ships, the gate-filling agent must append a new `ROADMAP-(next)` item with `status: Shipped` and `evidence: [PRD-NNN]`. A failure here breaks the roadmap's "complete index" property for urgent or follow-up work.

## Fixtures

Starting `ROADMAP.md` has items `ROADMAP-001` through `ROADMAP-005` (all statuses, does not matter). No existing item references the new PRD.

Sample PRD:

```markdown
# PRD-020: Example Feature
**Status**: Draft
(no `Roadmap item:` header)
```

## Steps

1. Run the gate-filling agent as PRD-020 promotes to `Implemented`.
2. Read the updated `ROADMAP.md`.
3. Read PRD-020's gate block and any comment above it.

## Pass criteria

- [ ] `ROADMAP.md` gains exactly one new item: `ROADMAP-006` (next sequential number after 005).
- [ ] New item has `Status: Shipped`.
- [ ] New item has `Evidence: [PRD-020]` (category-7 meta-reference permitted by §5.5).
- [ ] New item has `Last reviewed: <today UTC>`.
- [ ] New item has `PRD: PRD-020` in its metadata.
- [ ] No other roadmap items are modified (ROADMAP-001..005 untouched).
- [ ] PRD-020 gate block has a comment referencing `ROADMAP-006`.

## Fail examples

- Agent creates `ROADMAP-001` overwriting the existing item — numbering must increment past the max.
- New item carries `Evidence: []` or omits the evidence field — category-7 meta-reference must be populated per §4.2.
- New item opens as `Status: Candidate` — retroactive items write directly to `Shipped`.
