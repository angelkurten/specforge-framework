# PRD-002 Test #6: AgDR decision row, section, and naming

**Type**: conformance
**PRD reference**: [PRD-002 §9 row #6](../../002-sdd-2026-framework-alignment.md#9-test-plan)

## What this verifies

PRD-002 § 5 defines the Agent Decision Record (AgDR) contract across `prd-authoring.md` and `CONVENTIONS.md`.

## Fixtures

- `/Users/usuario/specforge/.claude/rules/prd-authoring.md`
- `/Users/usuario/specforge/CONVENTIONS.md`

## Steps

1. Read the decision table, the "Optional artifact: Agent Decision Records" section, and the "Naming" table in `prd-authoring.md`.
2. Read `CONVENTIONS.md` § 2.

## Pass criteria

- [ ] `prd-authoring.md` decision table has a row for a high-blast-radius decision a sub-agent makes autonomously during `workflow.md` step 9 → optional AgDR.
- [ ] An "Optional artifact: Agent Decision Records" section states the high bar (all-of: autonomous, costly to reverse, PRD does not answer "why") and that AgDR does **not** gate promotion.
- [ ] The "Naming" table has an `AgDR-NNN-kebab-case-title.md` row with independent numbering.
- [ ] `CONVENTIONS.md` § 2 has an AgDR naming subsection pointing to `templates/agdr.md` and deferring the "when to use" to `prd-authoring.md` (no duplication of the bar).

## Fail examples

- The "when to use" criteria are duplicated verbatim in both files (violates the rules-vs-conventions separation in `framework-maintenance.md`).
- The section omits "does not gate promotion", risking AgDR becoming a de-facto fourth gate field.
