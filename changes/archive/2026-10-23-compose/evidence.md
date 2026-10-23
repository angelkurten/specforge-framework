## Evidence

- **Ran**:
  - `python3 scripts/compose_test.py` before implementation: 7 of 7 failed (red). A human approved them, and they were locked.
  - `python3 scripts/compose_test.py` after implementation: 7 of 7 pass on the first green iteration.
  - `python3 scripts/compose_check.py changes/2026-10-23-compose` on the real record: exit 0, first with 7 lessons and again after review with 8.
  - Review fix round: `python3 scripts/compose_fix_test.py` failed 3 of 3 before the fixes (one test was tightened first, because it passed for the wrong reason). A human approved and locked it, and it passes 3 of 3 after. All nine suites listed in `v2-ci.yml` pass locally.
  - GitHub Actions, `cli-ci` on `v2`: runs 63–67 failed, runs 68–71 passed. This is how the "nobody read CI" lesson was found.
- **Result**: pass.
- **Not checked**:
  - `.github/workflows/v2-ci.yml` had not run before this commit; its first run is on this push.
- **Deviations from the contract**:
  - The review fix round changed `scripts/review_prep.py`, which now blocks on an empty range. That file is outside Scope; the change is the artifact for the empty-range lesson.
  - Composing today's lessons added two artifacts the Scope did not list: `.github/workflows/v2-ci.yml` and a fourth step in `.claude/skills/specforge-review/SKILL.md`. They are the first use's output, and they are recorded here as deviations from Scope.
  - `scripts/prd_check_test.py` failed 2 tests earlier today and later passed on the same code. Its first run in `v2-ci` (run 2, on `03f430d`) failed the same 2 tests, and that showed the cause. Both tests read `tools/cli/framework/examples/prd-001-login-example.md`, an untracked copy that exists only after the CLI is built. They passed only in a checkout where the CLI had been built. They now read the identical tracked file `examples/prd-001-login-example.md`. This is a fix to a v1 test file, outside Scope.

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

### Re-verification

The reviewer re-checked `03f430d` and returned PASS. B1 and S1–S4 are fixed, and so is the row-2 nit. The nits on `compose_test.py` (locked) and on `rows()` are not fixed. Its new findings:
- The `review_prep.py` Scope deviation was unrecorded, and Ran/Result were stale. Both are corrected above.
- Row 6 overclaimed what CI catches. It is narrowed to what CI does: run the suite.
- Two nits stay open: the empty-range test matches the substring "empty" (the test is locked), and an artifact of `.` is refused with the message "outside the repository" instead of "not a file".

