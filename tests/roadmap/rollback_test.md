# Test #26: Rollback conformance walkthrough

**Type**: e2e
**PRD reference**: [PRD-001 §9 row #26](../../001-product-roadmap.md#9-test-plan)

## What this verifies

§10.3 Rollback procedure: authoring a supersede PRD, removing 11 new files, reverting 5 edits, leaving team data (`ROADMAP.md`) untouched, and flagging in-flight PRDs with dangling `Roadmap item:` references. This is the full end-to-end rollback drill. A failure here means teams cannot back out of the roadmap concept cleanly.

## Fixtures

Starting repo state:

- PRD-001 is `Implemented` (all 11 new files and 5 file edits are present).
- A pre-existing team `ROADMAP.md` is present at repo root with at least one item.
- At least one in-flight PRD exists with `Status: Draft` and `Roadmap item: ROADMAP-NNN` in its header.

Rollback PRD-N is authored per §10.3, specifying removal and reversal operations.

## Steps

1. Execute the rollback procedure described in §10.3 against the fixture repo.
2. Inspect the filesystem for the **11 new files** (each must be removed):
   1. `ROADMAP.md`
   2. `.claude/rules/roadmap.md`
   3. `templates/roadmap.md`
   4. `agents/roadmap-product-generator.md`
   5. `agents/roadmap-ux-generator.md`
   6. `agents/roadmap-market-generator.md`
   7. `agents/roadmap-support-generator.md`
   8. `agents/roadmap-evidence-critic.md`
   9. `agents/roadmap-devils-advocate-critic.md`
   10. `agents/roadmap-opportunity-cost-critic.md`
   11. `agents/roadmap-risk-critic.md`
3. Inspect the **5 edited files** for reversion to their pre-PRD-001 state: `CLAUDE.md`, `.claude/rules/hard-rules.md`, `.claude/rules/workflow.md`, `.claude/rules/prd-authoring.md`, `.claude/rules/framework-maintenance.md`.
4. Inspect the pre-existing team `ROADMAP.md`.
5. Inspect in-flight PRDs for handling of their dead `Roadmap item:` headers.

## Pass criteria

- [ ] 11 new files removed (per §10.3 / §9 row #26 embedded checklist (a)).
- [ ] 5 file edits reverted (per §10.3 / §9 row #26 embedded checklist (b)).
- [ ] A pre-existing team `ROADMAP.md` is untouched (per §10.3 / §9 row #26 embedded checklist (c)).
- [ ] Any in-flight PRD with `Roadmap item:` header is flagged as dead-reference but not edited (per §10.3 / §9 row #26 embedded checklist (d)).

## Fail examples

- Rollback deletes the team's `ROADMAP.md` as part of "cleanup" — team data must not be touched.
- Rollback auto-strips `Roadmap item:` headers from in-flight PRDs — the PRDs should be flagged, not edited.
- Only 10 new files are removed (one of the briefings left behind) — full removal is required.
