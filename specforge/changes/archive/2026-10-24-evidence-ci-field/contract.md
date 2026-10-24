# The evidence report states CI

**Mode**: Contract

## Outcome

Every evidence report says what CI returned on the pushed head. A report without it does not pass review and does not archive. It is enforced the same way as the other four fields, not left as an instruction.

## Scope

In:
- A `CI` field in `templates/evidence-report.md`.
- `"CI"` in `review_prep.py`'s required evidence fields, which `archive.py` reuses.
- The test fixtures whose sample evidence reports lack the field.

Out:
- Fetching CI results automatically. The scripts stay offline, using the standard library and git only.
- Archived changes, whose reports are history.

## Context

- `specforge/changes/archive/2026-10-23-init-installs-v2/evidence.md` and `specforge/changes/archive/2026-10-23-specforge-namespace/evidence.md`: two reports omitted CI although `.claude/skills/specforge-review/SKILL.md` step 4 already asked for it. An instruction was not enough.
- `specforge/scripts/review_prep.py` `EVIDENCE_FIELDS` and `evidence_findings`.

## Constraints

- The script checks that the field is present and names at least one run: it must contain a run reference (`run 17`, `run #17`, an `/actions/runs/<id>` URL, or a commit hash with a digit). Whether the runs it names exist and are green is the reviewer's job (`specforge/core/review.md` § Evidence). This Constraint was widened after the second review; see the evidence's Deviations.

## Acceptance evidence

`python3 scripts/evidence_ci_test.py` and every suite in `v2-ci.yml` pass:

1. An evidence report with no `CI` field is a blocker naming `CI`.
2. An empty `CI` field is a blocker naming `CI`.
3. A filled `CI` field, with the other four fields filled, gives no evidence blocker.
4. `archive.py` refuses a change whose evidence lacks `CI`.
5. `templates/evidence-report.md` carries a `CI` field.

Added after review (`scripts/evidence_ci_fix_test.py`):

6. An empty `CI` field followed by a blank line and a section is a blocker. A field's value is its own line plus indented continuation lines only.
7. A placeholder `CI` value is a blocker: `pending`, `TBD`, `[TBD]`, `n/a`, `-`, `not run` or `none`.
8. A multi-line `CI` value passes, and `none` stays valid for fields where it is an answer.

Added after re-verification (`scripts/evidence_ci_fix2_test.py`):

9. A `CI` value that names no run is a blocker, however it is wrapped: `` `pending` ``, `**pending**`, `_TBD_`, `(pending)`, `—`, `CI pending`, `green`, `see Review`.
10. Sub-bullets separated from their field by a blank line belong to the field.

Added in the last budgeted round (`scripts/evidence_ci_fix3_test.py`):

11. A digit that is not a run reference is a blocker: `` `v2-ci`: pending ``, `pending (2 workflows queued)`, `TBD, after PR #12 merges`.
12. A run reference passes: `run 17`, `run #17`, an `/actions/runs/<id>` URL, or a commit hash with at least one digit.
13. An empty field does not borrow an indented block that follows a blank line; only sub-bullets do.
14. The template asks for the runs on the last code or test commit before the commit that holds the report.

## Stop and escalate

Stop if requiring the field breaks a locked test. Budget: 3 iterations.
