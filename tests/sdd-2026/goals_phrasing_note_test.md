# PRD-002 Test #8: § 2 Goals optional phrasing note

**Type**: conformance
**PRD reference**: [PRD-002 §9 row #8](../../002-sdd-2026-framework-alignment.md#9-test-plan)

## What this verifies

PRD-002 § 2 adds an **optional** event/condition phrasing hint for reactive goals — without mandating EARS or an Acceptance-Criteria section.

## Fixtures

- `/Users/usuario/specforge/.claude/rules/prd-authoring.md`
- `/Users/usuario/specforge/templates/prd.md`

## Steps

1. Read the "§ 2 Goals — optional phrasing for reactive goals" note in `prd-authoring.md`.
2. Read the § 2 Goals comment in `templates/prd.md`.

## Pass criteria

- [ ] `prd-authoring.md` carries the note with both the event-driven ("When … the system shall …") and unwanted ("If … then the system shall …") forms and a worked example mapping to a § 9 test row.
- [ ] The note is explicitly marked a **style suggestion, not a requirement**, scoped to reactive goals only.
- [ ] It explicitly forbids restructuring § 5 / § 6 / § 9 into this form and forbids adding a separate "Acceptance Criteria" section.
- [ ] `templates/prd.md` § 2 comment carries the same optional hint.

## Fail examples

- The note reads as mandatory ("Goals must use…"), contradicting the Non-Goal.
- A new "Acceptance Criteria" required section appears anywhere (duplicates § 9).
