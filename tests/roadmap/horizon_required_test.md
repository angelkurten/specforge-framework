# Test #18: Horizon conditional requirement

**Type**: conformance
**PRD reference**: [PRD-001 §9 row #18](../../001-product-roadmap.md#9-test-plan)

## What this verifies

§5.2 states `horizon` is required when `status` is `Candidate` or `Committed` and is unconstrained for `Shipped` (and `Parked`). A failure here either allows committed items without horizon or rejects shipped items for missing one.

## Fixtures

Three candidate items with the horizon field absent:

a. `Status: Candidate`, `Horizon:` missing.
b. `Status: Committed`, `Horizon:` missing.
c. `Status: Shipped`, `Horizon:` missing.

Concrete example for (a):

```markdown
### ROADMAP-030: candidate-no-horizon
**Status**: Candidate
**Last reviewed**: 2026-04-19
**Problem / outcome**: example.
**User**: admin
**Siblings likely impacted**: specforge

**Evidence**:
- SUPPORT-234
```

## Steps

1. Submit each fixture to the write-step validator (the lead agent at §4.1 step 7, or the equivalent validation path for retroactive items).
2. Record acceptance / rejection per fixture.

## Pass criteria

- [ ] Fixture (a) `Candidate` without horizon → rejected; error message names the conditional requirement.
- [ ] Fixture (b) `Committed` without horizon → rejected; error message names the conditional requirement.
- [ ] Fixture (c) `Shipped` without horizon → accepted; no error on the missing horizon field.
- [ ] Rejection messages in (a) and (b) reference §5.2 or the `horizon` field schema entry.
- [ ] Accepted fixture (c) writes to `ROADMAP.md` with no horizon line (field absent, not empty).

## Fail examples

- (c) is rejected because the field is missing — Shipped does not require horizon.
- (b) is accepted silently because the other required fields are present.
- (a) is accepted with a synthesised default horizon (e.g. "Later") — the validator must reject, not auto-populate.
