# Progress

**Budget**: 8 iterations, 3 USD

## Tasks

- [x] scripts/lock_checks_test.py test_1_an_invisible_character_is_refused_and_zwj_is_allowed (import invisible_points inside approve(): review_prep imports lock_tests)
- [x] scripts/lock_checks_test.py test_2_one_bad_file_refuses_the_whole_approval
- [x] scripts/lock_checks_test.py test_3_a_test_reapproved_after_the_lock_was_created_in_range_is_reported
- [x] scripts/lock_checks_test.py test_4_a_lock_at_the_base_keeps_its_report_and_is_not_reported_twice (already passes: keep it passing)
- [x] scripts/lock_checks_test.py test_5_review_md_names_the_new_report
- [x] `lock_checks_test` is in `.github/workflows/v2-ci.yml`
- [x] every suite listed in `.github/workflows/v2-ci.yml` passes

## Blocked

## Log
- iter 1: test_1 done — approve() now refuses invisible chars (import inside approve); ran `python3 scripts/lock_checks_test.py` → test_1 and test_2 pass, test_3 and test_5 still fail; review_prep_lock_ci_test run too.
- iter 2: test_2 done — validation runs before any write in approve() (iter 1 change covers it); ran `python3 scripts/lock_checks_test.py` → test_1, test_2, test_4 ok; test_3 and test_5 still fail (expected, later tasks).
- iter 3: test_3 done — `_added_entries` in review_prep.py reports `approved entry changed after the first approval` for locks created in range (not for locks at base); ran `python3 scripts/lock_checks_test.py` → test_1-4 ok, test_5 fails (next task); `review_prep_lock_ci_test.py` → OK.
- iter 4: test_4 done — no code change needed; ran `python3 scripts/lock_checks_test.py` → test_1-4 ok, test_5 fails (next task).
- iter 5: test_5 done — added the new-report sentence to § Lock changes in specforge/core/review.md; ran `python3 scripts/lock_checks_test.py` → 5 tests OK.
- iter 6: CI list done — added `lock_checks_test` to the v2-ci.yml suite loop; ran `grep -c lock_checks_test .github/workflows/v2-ci.yml` → 1.
- iter 7: full suites done — ran every suite in the v2-ci.yml loop (`python3 scripts/<suite>.py`, 49 suites incl. lock_checks_test) → all exit 0, no FAIL.
