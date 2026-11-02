# Test #17: Item status transition → Parked

**Type**: conformance
**PRD reference**: [PRD-001 §9 row #17](../../001-product-roadmap.md#9-test-plan)

## What this verifies

A user transitioning an item from `Committed` to `Parked` must not incidentally populate a `PRD:` backlink (parking is abandonment, not shipping) and must re-stamp `last_reviewed`. A failure here either invents a PRD reference or leaves the timestamp stale.

## Fixtures

Starting item:

```markdown
### ROADMAP-020: sample-committed-item
**Status**: Committed
**Horizon**: Now
**Last reviewed**: 2026-04-10
**Problem / outcome**: example product outcome.
**User**: admin
**Siblings likely impacted**: specforge

**Evidence**:
- SUPPORT-234, SUPPORT-441
```

User action: transition ROADMAP-020 to `Parked`.

## Steps

1. Execute the user-transition action against the fixture.
2. Read the resulting item in `ROADMAP.md`.

## Pass criteria

- [ ] `ROADMAP-020` `Status` is now `Parked`.
- [ ] `ROADMAP-020` has no `PRD:` field populated (the field is absent, or present and empty; it must not contain a PRD number).
- [ ] `ROADMAP-020` `Last reviewed` has been re-stamped to today's UTC date.
- [ ] `Horizon` may be preserved or blanked (§5.2 requires horizon only for Candidate/Committed; Parked is unconstrained). Either behaviour is acceptable but the field must not hold an illegal value.
- [ ] Evidence list is preserved verbatim.

## Fail examples

- A `PRD:` backlink is invented (e.g. `PRD: PRD-999`) — parked items have no shipping PRD.
- `Last reviewed` remains `2026-04-10` — re-stamp is required.
- `Status: Parked` but `Horizon` carries a garbage value like `Deferred` — must remain one of `Now | Next | Later` or be absent.
