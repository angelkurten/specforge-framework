# Test #16: Item status transitions — Candidate → Committed

**Type**: conformance
**PRD reference**: [PRD-001 §9 row #16](../../001-product-roadmap.md#9-test-plan)

## What this verifies

The step-7 user promotion path from `Candidate` to `Committed`: the transition is accepted, the horizon conditional (§5.2) is enforced, and `last_reviewed` re-stamps. A failure here corrupts the status lifecycle or silently drops the horizon requirement.

## Fixtures

Starting item (before user promotion):

```markdown
### ROADMAP-010: sample-candidate-item
**Status**: Candidate
**Horizon**: Next
**Last reviewed**: 2026-04-10
**Problem / outcome**: example product outcome.
**User**: admin
**Siblings likely impacted**: specforge

**Evidence**:
- SUPPORT-234, SUPPORT-441
```

User action: during step 7 of the generative cycle, promote ROADMAP-010 to `Committed` without removing or weakening the horizon.

## Steps

1. Execute the user-promotion action against the fixture.
2. Read the resulting item in `ROADMAP.md`.

## Pass criteria

- [ ] `ROADMAP-010` `Status` is now `Committed` (was `Candidate`).
- [ ] `ROADMAP-010` `Horizon` is preserved as `Next` (non-null per §5.2 conditional requirement).
- [ ] `ROADMAP-010` `Last reviewed` has been re-stamped to today's UTC date (was `2026-04-10`).
- [ ] No other field (Problem / outcome, User, Siblings, Evidence) is altered.
- [ ] If the same transition is attempted with `Horizon` removed, it is rejected — covered by test #18, but cross-reference here by confirming the horizon remains present post-transition.

## Fail examples

- `Last reviewed` remains `2026-04-10` — re-stamp is required on any edit per §5.2.
- `Status` flips to `Shipped` instead of `Committed` — user promotion from Candidate goes to Committed, not Shipped.
- `Horizon` is blanked to null on the transition — Committed requires a horizon.
