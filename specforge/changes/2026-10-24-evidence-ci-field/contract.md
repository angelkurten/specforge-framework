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

- `specforge/changes/archive/2026-10-23-compose/compose.md`, and `specforge/changes/archive/2026-10-23-init-installs-v2/evidence.md` and `specforge/changes/archive/2026-10-23-specforge-namespace/evidence.md`: two reports omitted CI although `.claude/skills/specforge-review/SKILL.md` step 4 already asked for it. An instruction was not enough.
- `specforge/scripts/review_prep.py` `EVIDENCE_FIELDS` and `evidence_findings`.

## Constraints

- The field is checked for presence and non-emptiness only. Whether the runs it names are green is the reviewer's job (`specforge/core/review.md` § Evidence).

## Acceptance evidence

`python3 scripts/evidence_ci_test.py` and every suite in `v2-ci.yml` pass:

1. An evidence report with no `CI` field is a blocker naming `CI`.
2. An empty `CI` field is a blocker naming `CI`.
3. A filled `CI` field, with the other four fields filled, gives no evidence blocker.
4. `archive.py` refuses a change whose evidence lacks `CI`.
5. `templates/evidence-report.md` carries a `CI` field.

## Stop and escalate

Stop if requiring the field breaks a locked test. Budget: 3 iterations.
