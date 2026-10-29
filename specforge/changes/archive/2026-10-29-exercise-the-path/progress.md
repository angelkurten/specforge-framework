# Progress

**Budget**: 6 iterations, 2 USD

## Tasks

- [x] scripts/exercise_path_test.py test_1_the_template_has_an_exercised_field_between_result_and_ci
- [x] scripts/exercise_path_test.py test_2_review_md_blocks_a_not_checked_user_visible_path
- [x] scripts/exercise_path_test.py test_3_the_review_skill_runs_the_path_before_dispatching
- [x] scripts/exercise_path_test.py test_4_decisions_records_exercising_the_path
- [x] every suite in `.github/workflows/v2-ci.yml` passes (run them as that file does)

## Blocked

## Log
- Lead: wrote test 3's step in `.claude/skills/specforge-review/SKILL.md` by hand, because `.claude/` is closed to the loop (deviation). It already passes; tick it after you run it. Yours are the template field, the `review.md` bullet and the `DECISIONS.md` entry, written as the contract's Scope says. Keep every existing template field and its order. `scripts/evidence_ci_test.py` asserts the template's `- **CI**:` line. `pnpm test` in `tools/cli` is not in your tools; the lead runs cli-ci.
- Iter 1: added `- **Exercised**:` between Result and CI in `templates/evidence-report.md`; ran `exercise_path_test.py` test_1 → OK, `evidence_ci_test.py` → 5 tests OK.
- Iter 2: added the `**Exercised.**` bullet to `specforge/core/review.md` § What the reviewer checks; ran `exercise_path_test.py` → test_1, test_2, test_3 ok, test_4 FAIL (next task).
- Iter 3: ran `python3 scripts/exercise_path_test.py` → test_1, test_2, test_3 ok (lead-written skill step passes), test_4 FAIL (next task); locked-test hash unchanged.
- Iter 4: appended the 2026-10-29 entry to `specforge/DECISIONS.md`; ran `python3 scripts/exercise_path_test.py` → 4 tests OK; locked-test hash unchanged.
- Iter 5: ran all 46 suites listed in `v2-ci.yml` as that file does (`python3 scripts/<suite>.py`) → all ok; locked-test hash unchanged. `pnpm test` in `tools/cli` not run (lead's).
