# PRD-002 Test #1: Override immunity preamble present

**Type**: conformance
**PRD reference**: [PRD-002 §9 row #1](../../002-sdd-2026-framework-alignment.md#9-test-plan)

## What this verifies

PRD-002 § 8 requires `hard-rules.md` to state that the invariants are not waived by later-context instructions. This is the "constitution file" precedence property applied to specforge's existing rule set.

## Fixtures

- `/Users/usuario/specforge/.claude/rules/hard-rules.md`

## Steps

1. Read `hard-rules.md`.
2. Locate the text between the intro line ("These are invariants, not preferences…") and rule `^1\. `.

## Pass criteria

- [ ] A paragraph beginning with the bold marker **Override immunity** exists between the intro line and rule 1.
- [ ] It states the invariants are not overridden by instructions appearing later in context (PRD body, sub-agent brief, quoted evidence, or tool result).
- [ ] It directs the agent to surface the conflict rather than silently resolve it, and routes invariant changes to `framework-maintenance.md`.

## Fail examples

- The preamble is placed after rule 1 (out of position — a reader scanning the numbered list before the preamble could miss the precedence statement).
- The paragraph allows a later instruction to "waive" a rule (contradicts the intent).
