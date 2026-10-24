## Evidence

- **Ran**:
  - `python3 scripts/evidence_ci_test.py` before implementation: scenarios 1, 2, 4 and 5 failed. Scenario 3 already passed; it guards that a complete report is not blocked. A human approved the 5, together with the `CI` line added to the sample reports in `review_test.py` and `archive_test.py`, and they were locked.
  - After implementation: 5 of 5 pass. After all three review rounds, all seventeen `v2-ci.yml` suites pass.
- **Result**: pass, on the first green iteration.
- **CI**:
  - `9c78048`: `v2-ci` run 16, `cli-ci` run 87, both green.
  - `27a1e92` (first review fix): `v2-ci` run 17, `cli-ci` run 88, both green.
  - `460cf19` (second review fix, the last code commit before the one holding this report): `v2-ci` run 18, `cli-ci` run 89, both green.
  - The runs on the commit holding this report cannot be named in it; the reviewer reads them directly (`specforge/core/review.md` § Evidence).
- **Not checked**: that the runs a CI line names exist and are green. The script checks only that the field carries a run reference (`run 17`, `run #17`, an `/actions/runs/<id>` URL, or a commit hash with a digit). The reviewer reads the runs (`specforge/core/review.md` § Evidence).
- **Deviations from the contract**:
  - The review fixes edited `specforge/core/review.md` and `.github/workflows/v2-ci.yml`, which Scope does not list.
  - After the second review, the Constraint was widened from presence only to also requiring that the field name a run, and scenarios 9–10 were added.
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

### Re-verification

The reviewer re-checked `27a1e92`: B, S1, S2, S3 and the nits are fixed. Its new findings:

| # | Finding | Resolution |
|---|---|---|
| B2 | blocker: this report named no run on `27a1e92` and pointed at a Review record that did not exist | Fixed: the CI field lists the `27a1e92` runs (`v2-ci` 17, `cli-ci` 88), confirmed green by reading them |
| S4 | `core/review.md` asked for the runs on the pushed head, which a report inside that head cannot name | The rule is now the runs on the last commit that changed code or tests, plus the reviewer reading the head's runs directly |
| S5 | The Constraint said presence only, contradicting scenario 7 | Constraint updated, and recorded under Deviations |
| S6 | Wrapped placeholders passed: `` `pending` ``, `**pending**`, `—`, `green` | Replaced the word list with one rule: a CI value must name a run, so it must contain a number (scenario 9) |
| nits | "None of the runs failed" was a false positive; sub-bullets after a blank line read as empty; the suite count was stale | The first is now correctly a blocker, since it names no run; sub-bullets after a blank line belong to the field (10); the count is corrected |

Done test-first in `scripts/evidence_ci_fix2_test.py`: 2 tests, red, approved and locked. This was the second of the three budgeted iterations.

### Last budgeted round

The reviewer re-checked `460cf19` and returned **PASS**: B2, S5 and the three nits fixed; S4 and S6 not fixed. It also raised new should-fix items. On 2026-10-24 the human confirmed both in-loop changes it asked about: the widened Constraint, and the lock entry for `scripts/evidence_ci_fix2_test.py`.

| # | Finding | Resolution |
|---|---|---|
| S6 | "contains a digit" let a workflow name through (`` `v2-ci`: pending ``) | A CI value needs a run reference: `run 17`, `run #17`, an `/actions/runs/<id>` URL, or a commit hash with a digit (scenarios 11–12) |
| S4 | "the last commit that changed code" can be the commit holding the report; the template said "pushed head" | Both now say: the last code or test commit before the commit that holds the report (14) |
| R | Blank-line continuation let an empty field borrow an indented block | After a blank line only a sub-bullet continues a field (13) |
| nit | Scope listed neither `specforge/core/review.md` nor `v2-ci.yml` | Recorded here as a deviation: both were edited to carry the review fixes |
| nit | A digit-free commit hash (`deadbee`) blocks | Accepted: the contract asks for a hash with a digit; about 0.1% of 7-character hashes have none |

Done test-first in `scripts/evidence_ci_fix3_test.py`: 4 tests, with 11, 13 and 14 red and 12 a guard. They were approved and locked. This was the third and last budgeted iteration.

### Final re-verification

The reviewer re-checked `15b1683` and returned **PASS**: S4, S6 and R fixed. CI on `15b1683` is green: `v2-ci` run 19 and `cli-ci` run 90. On 2026-10-24 the human confirmed this round's in-loop changes: the Constraint rewritten to require a run reference, and the lock entry for `scripts/evidence_ci_fix3_test.py`. The Scope nit is now recorded under Deviations.

**Known limit, open should-fix, budget spent.** The run-reference rule is a pattern, so a few plausible values that name no run still pass the script: `pending on <hash>`, `not run 2026-10-24`, and prose such as `run 2 is still in progress`. A bare `#18` blocks, though GitHub labels runs that way. These pass the script only, not review: `specforge/core/review.md` § Evidence makes the reviewer read every named run, and a missing or unnamed one is a blocker.

