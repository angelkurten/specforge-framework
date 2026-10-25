# Progress

**Budget**: 6 iterations, 2.50 USD

## Tasks

- [ ] scripts/loop_budget_fix4_test.py test_3_a_non_utf8_ledger_is_exit_4_before_any_agent (the ledger read becomes bytes + UTF-8 decode)
- [ ] scripts/loop_budget_fix4_test.py test_1_a_hard_link_swapped_in_during_an_iteration_is_not_written_through (the restore becomes temp file + os.replace)
- [ ] scripts/loop_budget_fix4_test.py test_2_a_ledger_that_is_already_a_hard_link_is_not_appended_through (the append becomes temp file + os.replace)
- [ ] scripts/loop_budget_fix4_test.py test_4_loop_md_no_longer_lists_these_gaps
- [ ] every suite in `.github/workflows/v2-ci.yml` passes (run them as that file does)

## Blocked

## Log
