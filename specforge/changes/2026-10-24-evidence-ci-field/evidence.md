## Evidence

- **Ran**:
  - `python3 scripts/evidence_ci_test.py` before implementation: scenarios 1, 2, 4 and 5 failed. Scenario 3 already passed; it guards that a complete report is not blocked. A human approved the 5, together with the `CI` line added to the sample reports in `review_test.py` and `archive_test.py`, and they were locked.
  - After implementation: 5 of 5 pass, and all fourteen `v2-ci.yml` suites pass.
- **Result**: pass, on the first green iteration.
- **CI**: on `9c78048`, `v2-ci` run 16 and `cli-ci` run 87, both green. The review fix commit's runs are recorded under Review.
- **Not checked**: that a CI line is true. The scripts check only that the field is present and non-empty; the reviewer reads the runs (`specforge/core/review.md` § Evidence).
- **Deviations from the contract**:
  - One fixture line was added to `scripts/review_test.py` and to `scripts/archive_test.py`: the `CI` field in their sample evidence reports. Both tests were approved in earlier changes. Their locks are archived and no longer enforced, so no `unlock` was involved. The human approved the edit as part of this change's red set, and the review below flagged it for confirmation. The edit only adds a line, and no assertion changed.

## Review

`specforge-reviewer` on `9c78048` returned BLOCK:

| # | Finding | Resolution |
|---|---|---|
| B | blocker: an empty `CI:` field followed by a section borrowed that section's text and passed | A field's value is its own line plus indented continuation lines only (scenario 6) |
| S1 | `pending`, `TBD`, `n/a`, `-`, `not run` and `none` passed; this report's own `pending` passed | A placeholder `CI` value is a blocker (7). This report's CI line now names real runs |
| S2 | `specforge/core/review.md` § Evidence gave the reviewer no CI duty; only a skill did | The Evidence check now reads the named runs on the pushed head, and a missing, red or unnamed run is a blocker |
| S3 | Two approved tests were edited with no recorded deviation | Recorded under Deviations, with the human's approval |
| nits | The Context listed a non-evidence file among the omissions; no scenario used a placeholder or an end-of-report field | Context corrected; scenarios 6–8 added |

The fixes were done test-first in `scripts/evidence_ci_fix_test.py`: 3 tests, with scenarios 6 and 7 red and 8 a guard. They were approved and locked. All fifteen `v2-ci.yml` suites pass.

