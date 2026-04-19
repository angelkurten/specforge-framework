# Test #27: Walkthrough — generative flow — happy path

**Type**: e2e
**PRD reference**: [PRD-001 §9 row #27](../../001-product-roadmap.md#9-test-plan)

## What this verifies

The 7-step generative cycle (§4.1) executes end-to-end when the user explicitly triggers it, with parallel dispatch of the generative and critical panels, user resolution recorded before write, and a clean diff. A failure here means the cycle drifts from parallel to sequential or skips the resolution-before-write ordering invariant.

## Fixtures

- A working specforge repo with the roadmap cycle installed (post-PRD-001 implementation).
- An existing `ROADMAP.md` (empty or seeded with the bootstrap item is fine).
- A user prompt to the lead agent: "expand the roadmap" (or equivalent explicit trigger).

## Steps

1. User issues the explicit trigger to the lead agent in a clean session.
2. Let the 7-step cycle run through write (§4.1 step 7).
3. Capture the full session transcript for review.
4. Capture the `git diff` on `ROADMAP.md` after write.

## Pass criteria

- [ ] (1) Transcript contains 4 generator dispatches in a single parallel block.
- [ ] (2) 4 critic dispatches in a single parallel block.
- [ ] (3) User-resolution recorded as prose reply before write.
- [ ] (4) `ROADMAP.md` diff shows N new items with `status: Candidate` and today's `last_reviewed: <UTC>`.

## Fail examples

- The 4 generators are dispatched serially (one tool call at a time across several messages) — must be a single parallel block.
- An item writes to `ROADMAP.md` before the user's prose resolution is on the transcript — ordering invariant violated.
- New items land with `last_reviewed` stamped as a non-UTC local date.
