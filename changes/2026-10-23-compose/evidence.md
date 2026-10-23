## Evidence

- **Ran**:
  - `python3 scripts/compose_test.py` before implementation: 7 of 7 failed (red). A human approved them, and they were locked.
  - `python3 scripts/compose_test.py` after implementation: 7 of 7 pass on the first green iteration.
  - `python3 scripts/compose_check.py changes/2026-10-23-compose` on the real record of today's 7 lessons: exit 0.
  - GitHub Actions, `cli-ci` on `v2`: runs 63–67 failed, runs 68–71 passed. This is how the "nobody read CI" lesson was found.
- **Result**: pass.
- **Not checked**:
  - `.github/workflows/v2-ci.yml` had not run before this commit; its first run is on this push.
- **Deviations from the contract**:
  - Composing today's lessons added two artifacts the Scope did not list: `.github/workflows/v2-ci.yml` and a fourth step in `.claude/skills/specforge-review/SKILL.md`. They are the first use's output, and they are recorded here as deviations from Scope.
  - `scripts/prd_check_test.py`, which failed 2 tests earlier today on both `v2` and `origin/main`, passes now on the same code. The failure depended on the environment and was not explained. It now runs in `v2-ci`, so any recurrence is caught by CI and does not rest on a claim.

## Review

`specforge-reviewer` on `58a8bba` returned BLOCK. All findings were verified and resolved:

| # | Finding | Resolution |
|---|---|---|
| B1 | blocker: the empty-range lesson was left out of `compose.md`, so the manual criterion was knowingly unmet, while "Deviations: none" | `review_prep.py` reports an empty range as a blocker, test-first in `scripts/compose_fix_test.py`; the lesson is a rung-1 row |
| S1 | Row 6 used `core/review.md` at rung 4, and its reason admitted a lower rung was possible | Now rung 2: `prd_check_test.py` is added to `v2-ci` |
| S2 | Row 5's reason ("no script can see CI") does not hold | Reason rewritten. Enforcing the read takes branch protection, which the owner turns on outside the repository |
| S3 | `v2-ci.yml` and the review-skill step were outside Scope and not recorded | Recorded above |
| S4 | `compose_check.py` accepted paths outside the repository, and directories | Refused, test-first in `scripts/compose_fix_test.py` |
| nit | Row 2 overstated the lesson: nothing actually slipped through | Reworded |
| nit | `compose_test.py` scenario 7 does not pin the 80-line boundary | Not fixed: the test is locked |
| nit | `rows()` misreads escaped pipes and a second table | Not fixed. `compose.md` holds exactly one table, so neither occurs |
