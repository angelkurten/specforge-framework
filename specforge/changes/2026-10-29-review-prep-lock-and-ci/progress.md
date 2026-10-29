# Progress

**Budget**: 8 iterations, 3 USD

## Tasks

- [ ] scripts/review_prep_lock_ci_test.py LockEntries test_1_an_entry_added_after_the_first_approval_is_reported
- [ ] scripts/review_prep_lock_ci_test.py LockEntries test_2_a_lock_at_base_gaining_an_entry_reports_it_and_a_single_approval_reports_nothing
- [ ] scripts/review_prep_lock_ci_test.py CiCommit test_3_naming_only_an_older_code_commit_reports_the_last_one
- [ ] scripts/review_prep_lock_ci_test.py CiCommit test_4_no_real_commit_named_or_change_folder_commits_report_nothing
- [ ] scripts/review_prep_lock_ci_test.py SiblingCi test_5_a_stale_sibling_commit_in_ci_names_the_siblings_last_commit
- [ ] every suite in `.github/workflows/v2-ci.yml` passes (run them as that file does)

## Blocked

## Log
- Lead: test 4 passes today on purpose. It guards against treating any 7+ hex as a commit, and against counting the change folder's own commits as code. Keep it green. Both findings are should-fix. Every existing suite must pass unchanged; `review_fp_test.py` asserts no should-fix in several scenarios. Update the `review.md` § Lock changes sentence that says the script does not report added entries. `pnpm test` in `tools/cli` is not in your tools; the lead runs cli-ci.
