# Progress

**Budget**: 10 iterations, 5 USD

## Tasks

- [x] scripts/symlinked_lock_test.py test_1_a_lock_replaced_by_a_symlink_spelling_the_base_text_is_a_blocker
- [x] scripts/symlinked_lock_test.py test_2_a_lock_added_as_a_symlink_is_a_blocker
- [x] scripts/symlinked_lock_test.py test_4_check_refuses_a_symlinked_lock
- [x] scripts/symlinked_lock_test.py test_3_a_regular_lock_reapproval_is_not_reported_as_a_symlink (passes today; must still pass)
- [x] Add symlinked_lock_test to the suite list in .github/workflows/v2-ci.yml, and every suite there passes

Fix round after review (VERDICT: BLOCK — the symlink refusal lives only in `main()`; `archive.py` calls `check()` and `loop.py` calls `read_lock()`):

- [ ] scripts/symlinked_lock_fix_test.py test_5_archive_refuses_a_symlinked_lock
- [ ] scripts/symlinked_lock_fix_test.py test_6_the_loop_does_not_start_on_a_symlinked_lock
- [ ] scripts/symlinked_lock_fix_test.py test_8_a_type_change_with_an_archive_move_is_a_blocker
- [ ] scripts/symlinked_lock_fix_test.py test_7 and test_9 (pass today; must still pass)
- [ ] Add symlinked_lock_fix_test to the suite list in .github/workflows/v2-ci.yml, and every suite there passes

## Blocked

## Log
- Task 1: added `_lock_modes`/`_mode_findings` to review_prep.py (git ls-tree modes, blocker on non-regular or type change). `python3 scripts/symlinked_lock_test.py -k test_1` → OK (test_2 and test_3 also pass now; test_4 still fails, as expected); review_test, reapprove_test, review_fp_test, archive_test → OK.
- Task 2: no code needed, Task 1's mode check already covers an added symlink. `python3 scripts/symlinked_lock_test.py -k test_2` → Ran 1 test, OK.
- Task 3: `lock_tests.py check` returns 1 and names `symlink` when `locked-tests.txt` is a symlink (check in `main`). `python3 scripts/symlinked_lock_test.py` → Ran 4 tests, OK; reapprove_test, archive_test, loop_test → OK.
- Task 4: no code needed. `python3 scripts/symlinked_lock_test.py -k test_3` → Ran 1 test, OK; full file → Ran 4 tests, OK.
- Task 5: added `symlinked_lock_test` to the suite list in v2-ci.yml. Ran all 18 suites from that list with `python3 scripts/<suite>.py` → all exit 0, OK.
