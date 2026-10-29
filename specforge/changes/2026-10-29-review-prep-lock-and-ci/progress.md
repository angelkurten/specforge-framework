# Progress

**Budget**: 12 iterations, 5 USD

## Tasks

- [x] scripts/review_prep_lock_ci_test.py LockEntries test_1_an_entry_added_after_the_first_approval_is_reported
- [x] scripts/review_prep_lock_ci_test.py LockEntries test_2_a_lock_at_base_gaining_an_entry_reports_it_and_a_single_approval_reports_nothing
- [x] scripts/review_prep_lock_ci_test.py CiCommit test_3_naming_only_an_older_code_commit_reports_the_last_one
- [x] scripts/review_prep_lock_ci_test.py CiCommit test_4_no_real_commit_named_or_change_folder_commits_report_nothing
- [x] scripts/review_prep_lock_ci_test.py SiblingCi test_5_a_stale_sibling_commit_in_ci_names_the_siblings_last_commit
- [x] every suite in `.github/workflows/v2-ci.yml` passes (run them as that file does)
- [ ] scripts/review_prep_lock_ci_fix_test.py FixRound test_6_an_archive_move_and_the_change_folders_own_commits_are_not_code
- [ ] scripts/review_prep_lock_ci_fix_test.py FixRound test_7_a_sub_bullet_after_a_blank_line_belongs_to_the_ci_field_and_the_finding_cites_its_line
- [ ] every suite in `.github/workflows/v2-ci.yml` passes again, review_prep_lock_ci_fix_test included

## Blocked

## Log
- Lead: test 4 passes today on purpose. It guards against treating any 7+ hex as a commit, and against counting the change folder's own commits as code. Keep it green. Both findings are should-fix. Every existing suite must pass unchanged; `review_fp_test.py` asserts no should-fix in several scenarios. Update the `review.md` § Lock changes sentence that says the script does not report added entries. `pnpm test` in `tools/cli` is not in your tools; the lead runs cli-ci.
- Iter 1: added `_added_entries()` to `specforge/scripts/review_prep.py` (called from `lock_findings`); `python3 scripts/review_prep_lock_ci_test.py LockEntries.test_1...` → OK; review/fp/invisible/foreign/reapprove*/evidence_ci*/sibling_repos/multi_sibling suites run (results in the iteration output).
- Iter 2: verified test 1 — `python3 scripts/review_prep_lock_ci_test.py LockEntries.test_1_an_entry_added_after_the_first_approval_is_reported` → OK; locked test sha256 unchanged (caa74f4d…). Ticked.
- Iter 3: `python3 scripts/review_prep_lock_ci_test.py LockEntries` → 2 tests OK (test 2 passes with the iter-1 `_added_entries`, no code change); locked test sha256 unchanged. Ticked.
- Iter 4: added `ci_commit_findings()` to `specforge/scripts/review_prep.py` (called from `review`); `python3 scripts/review_prep_lock_ci_test.py` → 5 tests OK (tests 4 and 5 also pass now); review/review_fp/evidence_ci/sibling_repos suites → OK; locked test sha256 unchanged. Ticked test 3 only.
- Iter 5: `python3 scripts/review_prep_lock_ci_test.py CiCommit` → 2 tests OK (test 4 passes with iter-4 `ci_commit_findings`, no code change); locked test sha256 unchanged (caa74f4d…). Ticked test 4 only.
- Iter 6: `python3 scripts/review_prep_lock_ci_test.py SiblingCi` → 1 test OK (passes with iter-4 `ci_commit_findings`, no code change); locked test sha256 unchanged (caa74f4d…). Ticked test 5 only.
- Iter 7: updated `specforge/core/review.md` § Lock changes (script now reports added entries); ran all 46 suites of `v2-ci.yml` from the repo root as that file does → all exit 0; locked tests untouched. `pnpm test` in tools/cli is left to the lead.
- Lead: review PASS with two code should-fix, both false positives of check (b). The human approved fix round tests 6-7 and raised the budget to 12 iterations, 5 USD.
  - In (b), a change-folder commit is any commit touching only the change's own folder, under either `specforge/changes/<name>/` or `specforge/changes/archive/<name>/`. That includes the archive move.
  - Read the CI field with exactly `evidence_findings`' regex, sharing one helper so the two cannot drift.
  - Cite the CI field's own line, not `evidence.md:1`.
