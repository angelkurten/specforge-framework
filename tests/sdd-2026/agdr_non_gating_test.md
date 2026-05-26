# PRD-002 Test #9: AgDR is non-gating; gate-block schema unchanged

**Type**: conformance
**PRD reference**: [PRD-002 §9 row #9](../../002-sdd-2026-framework-alignment.md#9-test-plan)

## What this verifies

PRD-002 § 3 (Non-Goals) and § 5 require that AgDR never becomes a gate precondition. The gate block stays a three-field schema.

## Fixtures

- `/Users/usuario/specforge/.claude/rules/workflow.md`
- `/Users/usuario/specforge/.claude/rules/gate-block.md`

## Steps

1. Read `workflow.md` step 9 (implementation-team brief and gate-filling).
2. Read `gate-block.md`.

## Pass criteria

- [ ] `workflow.md` step 9 states an emitted AgDR is referenced by number in the gate-block comment and **does not gate promotion**.
- [ ] `gate-block.md` still defines exactly three fields (`commit_hash`, `tests`, `system_artifact_diff`) — no AgDR field was added.
- [ ] The step-9 brief instructs sub-agents to apply the high bar in `prd-authoring.md` and notes most scopes emit none.

## Fail examples

- `gate-block.md` gained an `agdr:` field (AgDR became a fourth gate precondition).
- Step 9 makes AgDR mandatory for any step-9 decision, reintroducing over-documentation.
