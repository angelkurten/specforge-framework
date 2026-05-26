# PRD-002 Test #2: Hard rule 13 verbatim (spec-as-source prohibition)

**Type**: conformance
**PRD reference**: [PRD-002 §9 row #2](../../002-sdd-2026-framework-alignment.md#9-test-plan)

## What this verifies

PRD-002 § 2 / § 5 introduce hard rule 13 forbidding treatment of a frozen PRD/ADR as a code-regeneration source ("spec-as-source", à la Tessl).

## Fixtures

- `/Users/usuario/specforge/.claude/rules/hard-rules.md`

## Steps

1. Read `hard-rules.md`.
2. Search for a line matching regex `^13\. ` (numeric prefix, single space after the period).
3. Inspect the rule 13 block.

## Pass criteria

- [ ] Regex `^13\. ` matches exactly one line.
- [ ] The rule 13 block contains the literal substring `not a code-regeneration source`.
- [ ] The block names the `spec-as-source` pattern and references the frozen-snapshot invariant (rule 7) and the living-document invariant (rule 8).
- [ ] The block covers more than whole-file regeneration: it names partial/section regeneration **and** automated spec↔code synchronization in either direction (the clause backing the § 3 bidirectional non-goal in PRD-002).

## Fail examples

- A `^13\. ` line exists but paraphrases away the "spec-as-source" term, weakening grep-based detection.
- Rule 13 is appended without the cross-reference to invariants 7 and 8, losing the rationale chain.
