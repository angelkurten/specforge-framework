## Evidence

- **Ran**:
  - The three premise commands in the contract, by hand, before Red.
  - `python3 specforge/scripts/loop.py specforge/changes/2026-10-25-loop-budget`, twice, with `claude -p --output-format json --model sonnet --permission-mode acceptEdits "--allowedTools=Bash(python3 *),Bash(git diff *),Bash(git status *),Bash(git log *)"`.
  - Every suite in `.github/workflows/v2-ci.yml` locally, and `python3 specforge/scripts/lock_tests.py check specforge/changes/2026-10-25-loop-budget`.
- **Result**:
  - **Premises.** All three hold.
  - **Run 1.** Exit 5 at iteration 11, 10/11 tasks, 2.79 USD. The `BLOCKED` was correct: three existing fixtures relied on per-run counting, and the contract said to stop and ask.
  - **Run 2.** Exit 0, 1/1 remaining task in 1 iteration, 0.41 USD. That iteration also fixed the archive crash.
  - **Totals.** 12 iterations, 3.20 USD.
  - **Suites.** All 23 pass, `loop_budget_test` included. `lock_tests.py check` → exit 0.
- **CI**: GitHub Actions `v2-ci` run 40230031148 on `7248b2c`: success.
- **Not checked**:
  - Concurrent `loop.py` runs on one change appending to the ledger at once. Running two loops on one change was never supported.
  - A ledger edited by hand to lower the spend. The ledger is not locked; it shows in the diff like `progress.md` does.
- **Deviations from the contract**:
  - **Run 1 was not recorded in the ledger.** It ran on the old `loop.py`, already loaded in memory when the agent edited the file, so its 11 iterations are absent from `loop-runs.txt`. The ledger holds only run 2's line. The lead raised `**Budget**:` from 12 to 14 to cover run 2, against the contract's 12.
  - **Three fixtures adjusted.** On the human's decision after `BLOCKED`, the lead adjusted three existing fixtures: `scripts/loop_test.py` test_8, `scripts/premise_challenge_test.py` test_5 and `scripts/premise_challenge_fix2_test.py` test_14. The contract's Out list records it; no assertion changed.
  - **CI list.** The lead added `loop_budget_test` to `v2-ci.yml`.
