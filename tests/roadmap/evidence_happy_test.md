# Test #3: Evidence acceptance — each of 6 categories

**Type**: conformance
**PRD reference**: [PRD-001 §9 row #3](../../001-product-roadmap.md#9-test-plan)

## What this verifies

Each of the six evidence categories in §5.5 must be accepted when its entry is well-formed. A failure here means the critic is over-rejecting valid evidence or consolidation is dropping legitimate items.

## Fixtures

Six candidate items, each with exactly one evidence entry, one per category:

1. **Quantitative**: `- 14 tickets/week in SUPPORT board https://tracker.example.com/board/42, last 90 days`
2. **Ticket / issue**: `- SUPPORT-234, SUPPORT-441, LINEAR-XYZ-12`
3. **User research**: `- 2026-03-10 usability test, N=6, task completion 2/6`
4. **Direct feedback**: `- 'I can't find where to export' — user role: admin, channel: support email, 2026-03-18` (anonymised — no PII patterns)
5. **Competitor**: `- https://competitor.example.com/feature captured 2026-04-01`
6. **Hypothesis (with falsifiable plan)**: `- hypothesis: admins will adopt bulk actions once made discoverable; validate via usability test, N>=6 admin users, success = >=3/6 complete bulk edit without prompting`

All six fixtures use `Visibility: public`.

## Steps

1. Feed all 6 candidates through consolidation (§4.1 step 4).
2. Dispatch the evidence critic briefing with all 6 as `{{CANDIDATE_ITEMS}}`.
3. Record consolidation output and evidence critic findings per candidate.

## Pass criteria

- [ ] Consolidation accepts all 6 candidates (no auto-rejection, no soft flag).
- [ ] Evidence critic returns zero 🔴 findings across all 6 candidates.
- [ ] For each candidate, the critic correctly identifies the category (1 through 6) in its report or at minimum does not mislabel.
- [ ] Candidate #6 (hypothesis) is flagged by the hypothesis gate (Candidate/Later — verified in test #8) but that is a separate concern; the evidence critic itself emits no 🔴 on it because the validation plan is falsifiable.

## Fail examples

- Evidence critic returns 🔴 on candidate #5 because the URL lacks a capture date (it has one — `2026-04-01`).
- Consolidation rejects candidate #2 because ticket IDs are not URLs (they are IDs, which is the category shape).
