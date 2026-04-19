# Test #25: Hard-rule 12 verbatim match

**Type**: conformance
**PRD reference**: [PRD-001 §9 row #25](../../001-product-roadmap.md#9-test-plan)

## What this verifies

§7.2 prescribes the exact wording of hard-rule 12 in `.claude/rules/hard-rules.md`. Both the numeric prefix `^12\. ` and the distinguishing substring "PII findings (syntactic patterns in evidence quotes) cannot be waived" must be present. A failure here means the hard rule is either paraphrased, missing, or mis-numbered — breaking the chain from §7.2 to the canonical invariants list.

## Fixtures

Post-implementation state of:

- `/Users/usuario/specforge/.claude/rules/hard-rules.md`

## Steps

1. Read `hard-rules.md`.
2. Search for a line matching regex `^12\. ` (numeric prefix, rule 12 anchor, with a single space after the period).
3. On the matched line (or its continuation if the rule spans multiple lines), search for the literal substring `PII findings (syntactic patterns in evidence quotes) cannot be waived`.

## Pass criteria

- [ ] Regex `^12\. ` matches exactly one line in `hard-rules.md` (the start of rule 12).
- [ ] The rule 12 block (from the `^12\. ` line up to the next `^13\. ` line or end of the enumerated list) contains the literal substring `PII findings (syntactic patterns in evidence quotes) cannot be waived` verbatim.
- [ ] No `^13\. ` line exists (rule count is exactly 12 after the edit — PRD caption says "12 invariants").
- [ ] The block also contains the phrase about six evidence categories and falsifiable validation plans (the remainder of the §7.2 verbatim spec), verifying the full rule text landed.

## Fail examples

- Line matches `^12\. ` but substring check fails because the writer paraphrased to "PII findings cannot be waived" (dropping the parenthetical "syntactic patterns in evidence quotes").
- Line is written as `12\t` (tab instead of space) — regex `^12\. ` misses it, indicating a formatting drift from the surrounding rules.
- A `^13\. ` line exists because someone appended a 13th rule in the same commit without updating the CLAUDE.md caption ("12 invariants") to match.
