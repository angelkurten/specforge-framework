## Evidence

- **Ran**:
  - The four premise commands, by hand, before Red.
  - `python3 specforge/scripts/loop.py specforge/changes/2026-10-26-sibling-repos`, three times, with `claude -p --output-format json --model sonnet --permission-mode acceptEdits` and `--allowedTools=Bash(python3 *),Bash(git diff *),Bash(git status *),Bash(git log *)`.
  - `scripts/sibling_repos_test.py`, `scripts/sibling_repos_fix_test.py` and every suite in `.github/workflows/v2-ci.yml`.
  - In `tools/cli`, by the lead: `pnpm run build && pnpm run prepublish && pnpm test`.
- **Result**:
  - **Premises.** All four hold.
  - **Loop runs.**
    1. Exit 2 at start: the third premise had text between its command and `→ holds`. The lead fixed the line, and no iteration ran.
    2. Iterations 1-10: tasks 1-10 done, exit 0.
    3. Iterations 11-12: the fix round, tasks 11-12 done, exit 0.
    4. Iterations 13-17: fix round 2, after the review (PASS, four should-fix in `review_prep.py`), tasks 13-17 done, exit 0.
    5. Iterations 18-19: fix round 3, after the re-verification (a symlinked sibling lost the foreign-lock finding), tasks 18-19 done, exit 0.
  - **Totals.** 19 iterations, 5.97 USD (`loop-runs.txt`, 19 lines). The human raised the budget from 14 iterations and 5 USD to 20 iterations and 7 USD for fix round 2.
  - **Suites.** All v2 suites pass.
  - **CLI.** `pnpm test` passes 514 of 514.
- **CI**:
  - On `b2e50a4`, before the review: `v2-ci` run 40403597478 and `cli-ci` run 40403597471, both success.
  - On `4d0699c`, the last code commit after fix round 2: `v2-ci` run 40405417239 and `cli-ci` run 40405417121, both success.
  - `8e6aa12` is the last code commit, after fix round 3. Its runs, and the runs on the pushed head, are read before the final re-verification.
- **Not checked**:
  - A real `claude -p` iteration against a real sibling (`/Users/angelkurten/specforge` with `/Users/angelkurten/specforge-pilot`) using `--add-dir` and the env var. The prototype ran inside the scratchpad, where edits outside the working directory may already be allowed. The `--add-dir` requirement comes from code.claude.com/docs/en/permissions, not from a run.
  - That `Bash(git -C ../<sibling> diff *)` matches as written. Taken from the same page's wildcard rules, not from a run.
- **Deviations from the contract**:
  - **Written by the lead.** The guard's fail-closed wrapper and the review-skill line, because `.claude/` is closed to the loop. The human agreed (`5560fbf`).
  - **Fix round before review.** Test 10 (`scripts/sibling_repos_fix_test.py`) was raised by the lead and approved by the human, with the budget unchanged.
  - **Tests corrected before locking.** Test 5 had passed against the old script, because argparse rejects unknown flags. Test 6's fixture had no active lock, so the guard exited early. Both were fixed before `approve`.
  - **Premise line.** Reworded after `loop.py` refused it. The content did not change.
  - **CI file.** `.github/workflows/v2-ci.yml` gained two suites, which Scope did not declare.
  - **Review (PASS, five should-fix and a nit).**
    - Four should-fix in `review_prep.py` went to fix round 2 as tests 11-14 (`scripts/sibling_repos_fix2_test.py`), approved by the human.
    - The lead fixed the guide's should-fix by hand: `--repo` ships from 0.29.0.
    - The lead also fixed the nit by hand: the `loop.md` example command is now an indented code block.
  - **Budget raised.** The human raised the budget from 14 iterations and 5 USD to 20 iterations and 7 USD before fix round 2. Iteration 16 passed the original 5 USD, at 5.03 USD cumulative. The contract's Stop line now records the raise (re-verification nit).
  - **Re-verification (PASS).** All six earlier findings were fixed. The new should-fix, a symlinked sibling, went to fix round 3 as test 15 (`scripts/sibling_repos_fix3_test.py`), approved by the human with the budget unchanged.
