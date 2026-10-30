## Evidence

- **Ran**:
  - The two premise commands, by hand, before Red.
  - `python3 specforge/scripts/loop.py specforge/changes/2026-10-29-reviewer-design-mode --max-iterations 8 --max-cost 3`, once, with `claude -p --output-format json --model sonnet --permission-mode acceptEdits` and `--allowedTools=Bash(python3 *),Bash(git diff *),Bash(git status *),Bash(git log *)`.
  - Every suite in `.github/workflows/v2-ci.yml`, by the lead.
- **Result**:
  - **Premises.** Both hold.
  - **Red.** All 6 tests in `design_mode_test.py` and the edited `v2_adjustments_test` test_3 failed on `fd6c0d8`.
  - **Loop.** 8 iterations, 8/8 tasks, exit 0. Cost 2.29 USD (`loop-runs.txt`).
  - **Suites.** All 48 v2 suites pass, `design_mode_test` included.
- **Exercised**: the user-visible path is a lead dispatching the design mode. The lead dispatched `specforge-reviewer` with `Mode: design`, `Perspective: backend` and the archived contract of `2026-10-29-update-removes-retired`, with no packet, diff or evidence.
  - The reviewer read `review.md` § Design mode, the contract, and the code it names at the pre-Red base `9083554`. It reported in § Report's shape: `VERDICT: BLOCK`, 1 blocker, 5 should-fix and 3 nits, each with a `file:line` into the contract, and a `CHECKED` line.
  - The lead reproduced the blocker in a scratch clone of `8535de1`. An `update` that exits 10 on an unreadable retired file has already refreshed `CLAUDE.md`, and the re-run exits 1 on drift.
  - The lead also probed the case-only rename finding. Under `--strategy=theirs` nothing is deleted today, because the retired path is hashed after the refresh and reads as edited. Moving that classification before any write, the blocker's fix, would make the rename delete the file just written. Both go to the new change 1b. This change does not touch them.
- **CI**: on `8535de1`, the last code commit, pushed alone: `v2-ci` run 40999020333 and `cli-ci` run 40999020194, both success.
- **Not checked**:
  - The security and quality perspectives were not dispatched; only backend ran.
- **Deviations from the contract**:
  - **Written by the lead.** The reviewer definition's step 2 (`.claude/` is closed to the loop), in its own commit before the loop, and the edit to the locked `v2_adjustments_test` test_3, approved by the human.
