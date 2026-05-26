# PRD-002 Test #3: Invariant-count caption synchronization

**Type**: conformance
**PRD reference**: [PRD-002 §9 row #3](../../002-sdd-2026-framework-alignment.md#9-test-plan)

## What this verifies

PRD-002 § 2 requires the `N invariants` caption to track the enumerated rule count across the four files that carry it. This generalizes the PRD-001 §9 #25 guard from a hard-coded "12" to a sync check.

## Fixtures

- `/Users/usuario/specforge/.claude/rules/hard-rules.md`
- `/Users/usuario/specforge/CLAUDE.md`
- `/Users/usuario/specforge/README.md`
- `/Users/usuario/specforge/README.es.md`
- `/Users/usuario/specforge/docs/faq.md`

## Steps

1. In `hard-rules.md`, find the highest `^N\. ` enumerated rule number → `count`.
2. In each of `CLAUDE.md`, `README.md`, `README.es.md`, `docs/faq.md`, extract the integer in the "`<int> invariant(s)`" / "`<int> invariantes`" caption.

## Pass criteria

- [ ] `count` equals 13 (current state).
- [ ] All four captions (including `docs/faq.md`) equal `count`.
- [ ] No file under the repo root carries a stale "11 invariants" or "12 invariants" caption (excluding frozen PRD bodies and `CHANGELOG.md` history, which are historical records).

## Fail examples

- A 13th rule was added but a caption still reads "12 invariants".
- `docs/faq.md` retains a stale "11 invariants" line (the pre-existing drift PRD-002 corrects).
