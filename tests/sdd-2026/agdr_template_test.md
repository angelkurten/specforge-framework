# PRD-002 Test #7: AgDR template shape

**Type**: conformance
**PRD reference**: [PRD-002 §9 row #7](../../002-sdd-2026-framework-alignment.md#9-test-plan)

## What this verifies

PRD-002 § 5 specifies the AgDR template header fields and sections.

## Fixtures

- `/Users/usuario/specforge/templates/agdr.md`

## Steps

1. Read `templates/agdr.md`.

## Pass criteria

- [ ] File exists.
- [ ] Header carries: `Status: Recorded`, `Date`, `Agent`, `Triggering PRD`, `Sibling`, `Commit`.
- [ ] Sections present in order: 1 Decision, 2 Why the PRD did not cover this, 3 Alternatives Considered, 4 Blast radius and reversal cost, 5 Signals to Reconsider *(optional)*.
- [ ] A guidance comment states AgDRs are opt-in/rare and frozen like ADRs, with current behavior living in `SYSTEM_ARTIFACT.md`.

## Fail examples

- The template omits the `Commit` or `Triggering PRD` field, breaking traceability to the gate-block comment.
- Section 3 (Alternatives) is dropped, making the record indistinguishable from a plain note.
