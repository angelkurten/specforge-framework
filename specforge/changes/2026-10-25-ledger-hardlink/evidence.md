## Evidence

- **Ran**:
  - The two premise commands, by hand, before Red.
  - `python3 specforge/scripts/loop.py specforge/changes/2026-10-25-ledger-hardlink`, twice (once, then one fix round), with `claude -p --output-format json --model sonnet --permission-mode acceptEdits "--allowedTools=Bash(python3 *),Bash(git diff *),Bash(git status *),Bash(git log *)"`.
  - Every suite in `.github/workflows/v2-ci.yml`, and `lock_tests.py check`.
- **Result**:
  - **Premises.** Both hold.
  - **Loop.** Exit 0, 5/5 tasks in 5 iterations, 1.26 USD.
  - **Fix round after review (VERDICT: BLOCK: a fixed temp name was written through a planted link or symlink).** Exit 0, 2/2 tasks in 2 iterations, 0.78 USD; the temp file now comes from `tempfile.mkstemp`.
  - **Overall.** 7 iterations, 2.04 USD (`loop-runs.txt`, 7 lines).
  - **Suites.** All 29 pass, `loop_budget_fix4_test` and `loop_budget_fix5_test` included.
  - **Lock check.** `lock_tests.py check` → exit 0.
- **CI**: GitHub Actions `v2-ci` run 40241267710 on `d6b5707`, the last code commit: success. The pushed head that adds this report gets its own run, read before review.
- **Not checked**:
  - A temp file left behind when `loop.py` dies between `mkstemp` and `os.replace`. It is a stray `loop-runs.*.tmp` in the change folder; nothing reads it.
- **Deviations from the contract**: none. The human raised `**Budget**:` to `8 iterations, 2.50 USD` for the fix round.
