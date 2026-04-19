# Test #20: Theme status computation

**Type**: conformance
**PRD reference**: [PRD-001 §9 row #20](../../001-product-roadmap.md#9-test-plan)

## What this verifies

§5.3 defines theme status as derived (not stored) from member item statuses. The four fixtures below exercise each row of the composition table and the default "mix → In progress" case. A failure here breaks the display-only theme status surface.

## Fixtures

Four ROADMAP states, each with one theme and its member items:

Fixture (a) — 2 Shipped members:
- `ROADMAP-T-001` with items `ROADMAP-001` (Shipped), `ROADMAP-002` (Shipped).

Fixture (b) — 1 Shipped + 1 Parked:
- `ROADMAP-T-002` with items `ROADMAP-003` (Shipped), `ROADMAP-004` (Parked).

Fixture (c) — 2 Parked:
- `ROADMAP-T-003` with items `ROADMAP-005` (Parked), `ROADMAP-006` (Parked).

Fixture (d) — 1 Committed + 1 Shipped:
- `ROADMAP-T-004` with items `ROADMAP-007` (Committed, Horizon: Now), `ROADMAP-008` (Shipped).

Each item carries whatever additional required fields are needed to pass format validation; only status matters for this test.

## Steps

1. For each fixture, run the theme-status computation (per §5.3).
2. Record the computed status per theme.

## Pass criteria

- [ ] Fixture (a) `ROADMAP-T-001` → computed status `Shipped` (all members Shipped).
- [ ] Fixture (b) `ROADMAP-T-002` → computed status `In progress` (mix of Shipped and Parked → per §5.3: "Any mix including `Candidate` or `Committed` → In progress" — but note row 3 specifies mix of Shipped+Parked; per the table, (b) is also `In progress` per PRD §9 row #20 fixture description).
- [ ] Fixture (c) `ROADMAP-T-003` → computed status `Parked` (all members Parked).
- [ ] Fixture (d) `ROADMAP-T-004` → computed status `In progress` (mix includes Committed).
- [ ] In every fixture, the theme does not have a stored `Status:` field — the status is derived at read/display time.

## Fail examples

- Fixture (b) computes `Shipped` because the first item is Shipped — mixed composition must yield `In progress`.
- Fixture (d) computes `Committed` — there is no theme-level `Committed` status per §5.3.
- The computation persists the derived status to the theme block (should be display-only per §5.3).
