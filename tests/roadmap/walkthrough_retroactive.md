# Test #29: Walkthrough — retroactive flow

**Type**: e2e
**PRD reference**: [PRD-001 §9 row #29](../../001-product-roadmap.md#9-test-plan)

## What this verifies

§4.2 auto-update flow end-to-end: a PRD shipped without a `Roadmap item:` header causes the gate-filling agent to append a retroactive item in the same merge commit and record a back-reference in the PRD's gate-block comment. A failure here means the "complete index" property of the roadmap silently breaks for retroactive work.

## Fixtures

- Working specforge repo post-PRD-001 with existing `ROADMAP.md` containing at least one item.
- A sample PRD (e.g. `PRD-021`) authored to `Status: Draft` with no `Roadmap item:` header.
- The full step-9 implementation and re-review cycle has cleared for PRD-021 so that it is ready for gate-filling.

## Steps

1. Execute PRD-021's gate-filling step (moving Draft → Implemented).
2. Record the resulting merge commit hash.
3. Run `git show <commit>` and capture the list of files in the diff.
4. Inspect `ROADMAP.md` at the post-commit state.
5. Inspect PRD-021's gate block and the comment above it.

## Pass criteria

- [ ] (1) `git show <commit>` lists `ROADMAP.md` in the diff.
- [ ] (2) Diff adds exactly one item with `status: Shipped`.
- [ ] (3) Gate block populated in the same commit.
- [ ] (4) Gate-block comment references the new `ROADMAP-NNN`.

## Fail examples

- Two commits land: the PRD implementation, and the roadmap append separately — §4.2 requires the retroactive append in the same commit as gate-filling.
- The diff adds two items (the retroactive plus an "opportunistic" second one) — exactly one item must be added.
- The gate-block comment refers to the ROADMAP by title instead of id — the id is required per §4.2 final arrow.
