# Progress

**Budget**: 14 iterations, 5 USD

## Tasks

- [x] scripts/loop_budget_test.py test_3_each_iteration_appends_a_ledger_line (introduces `loop-runs.txt`, appended after each iteration)
- [x] scripts/loop_budget_test.py test_4_a_second_run_continues_the_count
- [x] scripts/loop_budget_test.py test_8_a_malformed_ledger_line_stops_before_any_agent
- [x] scripts/loop_budget_test.py test_1_a_budget_below_the_tasks_left_does_not_start
- [x] scripts/loop_budget_test.py test_2_a_budget_equal_to_the_tasks_left_starts (passes today; must still pass)
- [x] scripts/loop_budget_test.py test_5_spent_iterations_count_against_the_cap
- [x] scripts/loop_budget_test.py test_6_spent_cost_counts_against_the_cap
- [x] scripts/loop_budget_test.py test_7_max_iterations_overrides_the_budget_line
- [x] scripts/loop_budget_test.py test_9_archive_moves_the_ledger
- [x] scripts/loop_budget_test.py test_10_the_docs_say_the_budget_is_cumulative
- [x] every suite in `.github/workflows/v2-ci.yml` passes (run them as that file does)

## Blocked


## Log
- Task 1: loop.py appends `iteration <n> usd <cost>` to loop-runs.txt after each iteration; ran `python3 scripts/loop_budget_test.py LoopBudgetTests.test_3_each_iteration_appends_a_ledger_line` → OK (1 test).
- Task 2: loop.py reads loop-runs.txt at start (iteration count = lines, spent cost = sum of usd), so the count and cost cap are cumulative; ran `python3 scripts/loop_budget_test.py LoopBudgetTests.test_4_a_second_run_continues_the_count LoopBudgetTests.test_3_each_iteration_appends_a_ledger_line` → OK (2 tests).
- Task 3: loop.py validates every loop-runs.txt line (`iteration <int> usd <float>`) before any agent runs, else exit 4 quoting the line; ran `python3 scripts/loop_budget_test.py LoopBudgetTests.test_8_a_malformed_ledger_line_stops_before_any_agent LoopBudgetTests.test_3_each_iteration_appends_a_ledger_line LoopBudgetTests.test_4_a_second_run_continues_the_count` → OK (3 tests).
- Task 4: loop.py refuses at start with exit 2 when cap minus spent iterations is below the unticked tasks (message names both); ran `python3 scripts/loop_budget_test.py` → tests 1, 2, 5 pass; only test_6 (cost already at cap) and test_10 (docs) still fail, both later tasks.
- Task 5: no code change needed; ran `python3 scripts/loop_budget_test.py LoopBudgetTests.test_2_a_budget_equal_to_the_tasks_left_starts` → OK (1 test).
- Task 6: loop.py stops with exit 3 before any agent when the ledger's spent cost is at or over the cap; ran `python3 scripts/loop_budget_test.py` → 9 of 10 pass, only test_10 (docs, a later task) fails.
- Task 7 (test_5): no code change needed (the refusal from task 4 counts ledger lines); ran `python3 scripts/loop_budget_test.py LoopBudgetTests.test_5_spent_iterations_count_against_the_cap` → OK (1 test).
- Task 8 (test_7): no code change needed (`--max-iterations` already overrides the budget line before the cumulative check); ran `python3 scripts/loop_budget_test.py LoopBudgetTests.test_7_max_iterations_overrides_the_budget_line` → OK (1 test).
- Task 9 (test_9): no code change needed (archive.py moves the whole change folder, ledger included); ran `python3 scripts/loop_budget_test.py LoopBudgetTests.test_9_archive_moves_the_ledger` → OK (1 test).
- Task 10 (test_10): loop.md and loop.py docstring now name `loop-runs.txt` and say the budget is cumulative; ran `python3 scripts/loop_budget_test.py` → 10 tests OK.
- Lead, 2026-10-25: BLOCKED resolved by the human — three existing fixtures adjusted by the lead (contract Out). The archive crash (FileNotFoundError writing loop-runs.txt after the folder moved) is a loop.py bug for the next iteration to fix. First run: 11 iterations, 2.79 USD.
- Task 11: archive_test test_8 and archive_fix_test crashed writing loop-runs.txt after the folder moved; loop.py now writes the ledger only if the change folder exists; ran all 21 suites of v2-ci.yml in order → all pass (exit 0 each), plus loop_budget_test → 10 tests OK.
