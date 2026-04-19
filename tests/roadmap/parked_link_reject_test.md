# Test #12: PRD rejects Parked roadmap-item link

**Type**: conformance
**PRD reference**: [PRD-001 §9 row #12](../../001-product-roadmap.md#9-test-plan)

## What this verifies

§5.8 requires `Roadmap item:` to resolve to an item with `status != Parked`. A failure here means a PRD can link to a deliberately abandoned item, resurrecting it silently on ship.

## Fixtures

`ROADMAP.md` contains:

```markdown
### ROADMAP-099: abandoned-item
**Status**: Parked
**Horizon**: Later
**Last reviewed**: 2025-11-01
**Problem / outcome**: previously considered, intentionally parked.
**User**: admin
**Siblings likely impacted**: specforge

**Evidence**:
- SUPPORT-100
```

Sample PRD:

```markdown
# PRD-012: Example Feature
**Status**: Draft
**Roadmap item**: ROADMAP-099
```

## Steps

1. Submit the PRD to the PRD-authoring validation (the lead agent performing the step-1 scoping check or the pre-merge reviewer panel).
2. Record the validator's response.

## Pass criteria

- [ ] Validation rejects the PRD with an error citing "`Roadmap item:` references a Parked item" (or equivalent language derived from §5.8 "`status != Parked`").
- [ ] The rejection names `ROADMAP-099` and the reason (`status: Parked`).
- [ ] The PRD is not allowed to merge in its current state; the user must either choose a non-Parked item or remove the header.
- [ ] No change is written to `ROADMAP-099` — its status remains `Parked` (the validator does not silently flip it to un-parked).

## Fail examples

- Validator passes because the id resolves — it must also check status.
- Validator flips `ROADMAP-099` to `Candidate` to "repair" the reference — it must reject, not auto-fix.
