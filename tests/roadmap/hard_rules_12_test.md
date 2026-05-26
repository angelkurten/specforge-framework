# Test #25: Hard-rule 12 verbatim match

**Type**: conformance
**PRD reference**: [PRD-001 §9 row #25](../../001-product-roadmap.md#9-test-plan)
**Contract revised by**: [PRD-002 §9 row #4](../../002-sdd-2026-framework-alignment.md#9-test-plan) — the count guard below changed from "exactly 12 / no rule 13" to caption-synchronization when hard rule 13 was introduced. The rule-12 verbatim check is unchanged.

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
- [ ] **Caption synchronization (revised by PRD-002).** The highest enumerated `^N\. ` rule number in `hard-rules.md` equals the `N invariants` caption in `CLAUDE.md` (and `README.md` / `README.es.md`). The count is no longer hard-coded to 12; rule 13 is permitted as long as the captions match. A count/caption mismatch fails this criterion.
- [ ] The block also contains the phrase about six evidence categories and falsifiable validation plans (the remainder of the §7.2 verbatim spec), verifying the full rule text landed.

## Fail examples

- Line matches `^12\. ` but substring check fails because the writer paraphrased to "PII findings cannot be waived" (dropping the parenthetical "syntactic patterns in evidence quotes").
- Line is written as `12\t` (tab instead of space) — regex `^12\. ` misses it, indicating a formatting drift from the surrounding rules.
- A `^13\. ` line exists but the `CLAUDE.md` / `README.md` / `README.es.md` captions still say "12 invariants" — a count/caption desync (the original guard's real target, now generalized by PRD-002).
