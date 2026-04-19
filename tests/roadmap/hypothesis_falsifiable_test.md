# Test #9: Hypothesis — non-falsifiable plan

**Type**: conformance
**PRD reference**: [PRD-001 §9 row #9](../../001-product-roadmap.md#9-test-plan)

## What this verifies

A category-6 hypothesis entry whose validation plan lacks method, population, and success threshold is forbidden-semantic (§5.5 "A category-6 hypothesis with a non-falsifiable validation plan … — 🔴"). A failure here means unfalsifiable speculation can carry the evidence badge.

## Fixtures

Candidate item with a category-6 entry but an unfalsifiable plan:

```markdown
**Evidence**:
- hypothesis: users will love this; validate: ask them
```

And a control item with a falsifiable plan (to confirm the critic does not blanket-reject category-6):

```markdown
**Evidence**:
- hypothesis: users will love this; validate via usability test, N>=6, success = >=4/6 express preference over baseline
```

## Steps

1. Dispatch the evidence critic briefing with both fixtures as `{{CANDIDATE_ITEMS}}`.
2. Record findings per fixture.

## Pass criteria

- [ ] Non-falsifiable fixture produces a 🔴 finding from the evidence critic, citing "non-falsifiable validation plan" (or equivalent language from §5.5).
- [ ] The 🔴 finding explicitly names at least one of the three missing dimensions: method, population, success threshold.
- [ ] Falsifiable control fixture produces zero 🔴 findings from the evidence critic (the hypothesis gate from test #8 is a separate concern).
- [ ] Severity is 🔴 (not 🟡) — §5.5 classifies this as a blocker.

## Fail examples

- Critic returns 🟡 because "the hypothesis flag is present" — flag presence alone is insufficient; plan falsifiability is required.
- Critic rejects the control fixture because it looks "speculative" — a falsifiable plan is acceptance-worthy.
