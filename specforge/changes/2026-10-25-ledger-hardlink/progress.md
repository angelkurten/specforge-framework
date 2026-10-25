# Progress

**Budget**: 8 iterations, 2.50 USD

## Tasks

- [x] scripts/loop_budget_fix4_test.py test_3_a_non_utf8_ledger_is_exit_4_before_any_agent (the ledger read becomes bytes + UTF-8 decode)
- [x] scripts/loop_budget_fix4_test.py test_1_a_hard_link_swapped_in_during_an_iteration_is_not_written_through (the restore becomes temp file + os.replace)
- [x] scripts/loop_budget_fix4_test.py test_2_a_ledger_that_is_already_a_hard_link_is_not_appended_through (the append becomes temp file + os.replace)
- [x] scripts/loop_budget_fix4_test.py test_4_loop_md_no_longer_lists_these_gaps
- [x] every suite in `.github/workflows/v2-ci.yml` passes (run them as that file does)

Fix round after review (VERDICT: BLOCK — fixed temp name written through a planted link or symlink):

- [x] scripts/loop_budget_fix5_test.py test_5_a_link_or_directory_planted_at_the_temp_path_is_never_written_through
- [x] every suite in `.github/workflows/v2-ci.yml` passes (run them as that file does)

## Blocked

## Log
- Task 1: loop.py ledger read is now bytes + UTF-8 decode, exit 4 on failure; `python3 scripts/loop_budget_fix4_test.py -k test_3` → OK (1 test).
- Task 2: loop.py restore of an altered ledger is now temp file + `os.replace`; `python3 scripts/loop_budget_fix4_test.py -k test_1` → OK (1 test).
- Task 3: loop.py append now builds ledger bytes + new line, temp file + `os.replace` (restore folded in); `python3 scripts/loop_budget_fix4_test.py -k test_2` → OK (1 test); full fix4 suite: only test_4 fails (task 4).
- Task 4: removed the known-gaps sentence from specforge/core/loop.md:52; `python3 scripts/loop_budget_fix4_test.py` → Ran 4 tests, OK.
- Task 5: ran all 28 suites from v2-ci.yml in order (`python3 scripts/<suite>.py`); every one exited 0.
- Lead, fix round: `**Budget**:` raised by the human's approval to `8 iterations, 2.50 USD` against the ledger (5 lines, 1.26 USD).
- Task 6: loop.py temp file now `tempfile.mkstemp` in the change folder (fixed `.tmp` name gone); `python3 scripts/loop_budget_fix5_test.py` → Ran 5 tests, OK.
- Task 7: ran all 29 suites from v2-ci.yml in order (`python3 scripts/<suite>.py`, incl. loop_budget_fix4/fix5); every one exited 0.
