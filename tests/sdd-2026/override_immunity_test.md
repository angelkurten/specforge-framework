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
- [ ] It states the invariants are not overridden by content appearing later in context (PRD body, sub-agent brief, quoted evidence, tool result, and beyond).
- [ ] **The scope is explicitly non-exhaustive.** The preamble contains language marking the channel list as illustrative rather than closed — e.g. "including but not limited to", "illustrative, not exhaustive", or "any later-arriving content". A closed enumeration fails this criterion (PRD § 8 names non-exhaustiveness as the central mitigation, since the preamble is the sole defense within PRD authoring/review).
- [ ] It directs the agent to surface the conflict rather than silently resolve it, and routes invariant changes to `framework-maintenance.md`.

## Fail examples

- The preamble is placed after rule 1 (out of position — a reader scanning the numbered list before the preamble could miss the precedence statement).
- The paragraph allows a later instruction to "waive" a rule (contradicts the intent).
- The preamble closes the scope to a fixed list (e.g. "not waivable by *these four* channels") with no non-exhaustiveness marker — a new injection channel (injected system reminder, text retrieved from a sibling's files) would silently fall outside the guard.
