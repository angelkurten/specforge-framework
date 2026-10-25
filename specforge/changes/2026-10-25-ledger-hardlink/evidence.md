## Evidence

- **Ran**:
  - The two premise commands, by hand, before Red.
  - `python3 specforge/scripts/loop.py specforge/changes/2026-10-25-ledger-hardlink`, once, with `claude -p --output-format json --model sonnet --permission-mode acceptEdits "--allowedTools=Bash(python3 *),Bash(git diff *),Bash(git status *),Bash(git log *)"`.
  - Every suite in `.github/workflows/v2-ci.yml`, and `lock_tests.py check`.
- **Result**:
  - **Premises.** Both hold.
  - **Loop.** Exit 0, 5/5 tasks in 5 iterations, 1.26 USD (`loop-runs.txt`).
  - **Suites.** All 28 pass, `loop_budget_fix4_test` included.
  - **Lock check.** `lock_tests.py check` → exit 0.
- **CI**: GitHub Actions `v2-ci` run 40240675524 on `1385b13`, the last code commit: success. The pushed head that adds this report gets its own run, read before review.
- **Not checked**:
  - The temp file has a fixed name, `loop-runs.txt.tmp`, in the change folder. An agent that pre-creates it as a hard link to another file would make `write_bytes` write through that link. No test covers it; the lead saw it in the diff and left it to review rather than patch code outside the loop.
- **Deviations from the contract**: none.
