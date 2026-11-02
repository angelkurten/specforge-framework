# Test #11: PRD → roadmap link round-trip

**Type**: conformance
**PRD reference**: [PRD-001 §9 row #11](../../001-product-roadmap.md#9-test-plan)

## What this verifies

When a PRD carries `Roadmap item: ROADMAP-NNN` in its header and is promoted to `Implemented`, the auto-update flow (§4.2) must flip the item's status to `Shipped`, write the `PRD:` backlink on the item, and stamp `last_reviewed`. A failure here breaks the bidirectional trace between roadmap and implementation.

## Fixtures

Starting `ROADMAP.md` contents:

```markdown
### ROADMAP-001: sample-committed-item
**Status**: Committed
**Horizon**: Now
**Last reviewed**: 2026-04-10
**Problem / outcome**: example product outcome.
**User**: admin
**Siblings likely impacted**: specforge

**Evidence**:
- SUPPORT-234, SUPPORT-441
```

Sample PRD header:

```markdown
# PRD-007: Example Feature
**Status**: Draft
**Roadmap item**: ROADMAP-001
```

The PRD transitions Draft → Implemented during the test.

## Steps

1. Run the gate-filling agent (§4.2 flow) against PRD-007 as it promotes to `Implemented`.
2. Read the updated `ROADMAP.md`.
3. Read the gate block and its surrounding comment on PRD-007.

## Pass criteria

- [ ] `ROADMAP-001` `Status` field is now `Shipped` (was `Committed`).
- [ ] `ROADMAP-001` now carries `**PRD**: PRD-007` (field added or filled).
- [ ] `ROADMAP-001` `Last reviewed` is stamped to today's UTC date (verify using the date at test execution).
- [ ] PRD-007 gate block has a comment above it referencing `ROADMAP-001` (per §4.2 final arrow).
- [ ] No new ROADMAP item is appended — the existing ROADMAP-001 is updated in place.

## Fail examples

- `ROADMAP-001` status remains `Committed` — the flip to `Shipped` is missing.
- A second item `ROADMAP-002` is appended as a retroactive entry — retroactive path must not fire when the header is present.
- `Last reviewed` is updated to local time rather than UTC.
