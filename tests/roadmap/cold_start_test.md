# Test #14: Cold-start retroactive — no pre-existing ROADMAP.md

**Type**: conformance
**PRD reference**: [PRD-001 §9 row #14](../../001-product-roadmap.md#9-test-plan)

## What this verifies

The adoption path in §10.2 (b): a team that pulls specforge without creating a `ROADMAP.md` has its first `ROADMAP.md` created by the first PRD that ships. The gate-filling agent must create the file and seed `ROADMAP-001` with `status: Shipped`. A failure here breaks adoption for teams that do not run the generative cycle upfront.

## Fixtures

Fixture repo state:

- specforge framework files present (templates, rules, briefings).
- `ROADMAP.md` does NOT exist at repo root.
- Sample PRD with no `Roadmap item:` header:
  ```markdown
  # PRD-001: Example Team's First Feature
  **Status**: Draft
  ```

## Steps

1. Run the gate-filling agent as the sample PRD promotes to `Implemented`.
2. Check the fixture repo for `ROADMAP.md` presence and contents.
3. Read the PRD's gate block.

## Pass criteria

- [ ] `ROADMAP.md` exists at repo root after gate-filling (it did not exist before).
- [ ] `ROADMAP.md` contains exactly one item: `ROADMAP-001` (not `ROADMAP-002` or any other starting number).
- [ ] `ROADMAP-001` has `Status: Shipped`.
- [ ] `ROADMAP-001` has `Evidence: [PRD-001]` (the sample PRD's number — adjust if fixture uses a different number).
- [ ] `ROADMAP-001` has `Last reviewed: <today UTC>`.
- [ ] The file header carries `**Last rotated**: <today UTC>` and `**Stale threshold**: 6 months` (defaults per `templates/roadmap.md`).
- [ ] The PRD's gate block carries a comment referencing `ROADMAP-001`.

## Fail examples

- Agent fails because `ROADMAP.md` does not exist — cold start requires file creation.
- `ROADMAP.md` is created but lacks the header (`Last rotated`, `Stale threshold`) — defaults must be populated.
- First item is numbered `ROADMAP-002` — numbering starts at 001 on cold start.
