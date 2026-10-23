# Compose: turn each lesson into the cheapest thing that catches it

**Mode**: Contract

## Outcome

A change closes by recording what it taught. Each lesson gets one rung of the mitigation ladder: test, executable rule, example, instruction, or doc. Each rung points at an artifact that exists in the repository. A script refuses a record that climbs past a rung without saying why the lower one is not enough, or that grows an instruction file past its cap.

## Scope

In:
- `core/compose.md`: the ladder, the record format, and when to compose.
- `scripts/compose_check.py`: validates a change's `compose.md`.
- The `specforge-compose` skill.
- A real `compose.md` for the lessons of the six changes archived today, as this change's first use.

Out:
- Making `archive.py` require `compose.md`. Its locked tests build changes without one.
- Periodic harness review.

## Context

- The v2 brief, "Escalera de mitigación y mantenimiento del harness": five rungs; climbing a rung requires justifying why the previous one is not enough; every new entry answers "would the system catch this alone next time?".
- `tools/cli/src/validators/claude-md-size.ts`: the existing hard limit of 80 lines for `CLAUDE.md`.
- `scripts/review_prep.py` `TEST_FILE`: what counts as a test file.
- `changes/archive/*/evidence.md`: the review tables, deviations and Not checked items that are today's lessons.

## Constraints

- Python 3 standard library only.
- The script checks structure and existence only. Whether the chosen rung is right is the human's call at compose time.
- The instruction-file cap is 80 lines, the same as `CLAUDE.md`, and applies to every rung-4 artifact named `AGENTS.md` or `CLAUDE.md`.

## Acceptance evidence

`python3 scripts/compose_test.py` passes:

1. A valid `compose.md` exits 0.
2. A missing `compose.md`, or one with no lesson rows, exits 1.
3. A rung outside the five exits 1 and names the row.
4. An artifact path that does not exist exits 1 and names it.
5. A rung above 1 with an empty "Why not lower" exits 1.
6. A rung-1 artifact that is not a test file exits 1.
7. A rung-4 `AGENTS.md` or `CLAUDE.md` over 80 lines exits 1 with its line count.

Manual: `changes/2026-10-23-compose/compose.md` records today's lessons, and `compose_check.py` exits 0 on it.

## Stop and escalate

Stop if a lesson from today has no artifact that could catch it at any rung: that is a question for the human, not a doc entry. Budget: 3 iterations.
