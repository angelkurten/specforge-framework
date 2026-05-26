# PRD-002 Test #5: Decision-table lower-bound row

**Type**: conformance
**PRD reference**: [PRD-002 §9 row #5](../../002-sdd-2026-framework-alignment.md#9-test-plan)

## What this verifies

PRD-002 § 2 adds an explicit lower bound to the PRD-vs-ADR-vs-`SYSTEM_ARTIFACT` decision table for small observable changes below the PRD size floor.

## Fixtures

- `/Users/usuario/specforge/.claude/rules/prd-authoring.md`

## Steps

1. Read the "Decision: PRD vs ADR vs SYSTEM_ARTIFACT update" table.

## Pass criteria

- [ ] A row exists for a small change *with* observable behavior below the PRD size floor (references the ~300-line floor / `CONVENTIONS.md` § 1).
- [ ] Its action routes to a `SYSTEM_ARTIFACT.md` update if state changed, plus commit-message rationale.
- [ ] The row carries an escalation clause ("escalate to a PRD only if a reviewer flags risk or the change grows past the floor").

## Fail examples

- The new row collapses into the existing "bug fix / refactor without observable behavior change" row, losing the *observable* distinction.
- No escalation clause, leaving the lower bound a one-way trap.
