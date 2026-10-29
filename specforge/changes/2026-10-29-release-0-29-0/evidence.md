## Evidence

- **Ran**:
  - The three premise commands, by hand, before Red.
  - `python3 specforge/scripts/loop.py specforge/changes/2026-10-29-release-0-29-0`, twice, with `claude -p --output-format json --model sonnet --permission-mode acceptEdits` and `--allowedTools=Bash(python3 *),Bash(git diff *),Bash(git status *),Bash(git log *)`.
  - Every suite in `.github/workflows/v2-ci.yml`.
  - After the commit, in `tools/cli`: `pnpm run build && pnpm run prepublish && pnpm test`.
- **Result**:
  - **Premises.** All three hold.
  - **First run.** Exit 2 at start: a premise had text between its command and `→ holds`. The lead fixed the line, and no iteration ran.
  - **Second run.** 5 iterations, 5/5 tasks, exit 0. Cost 1.59 USD (`loop-runs.txt`, 5 lines).
  - **Suites.** Every v2 suite passes, `release_0_29_0_test` included.
  - **CLI.** `pnpm test` passes 514 of 514.
- **CI**: on `1f7c5ed`, the release commit, pushed alone: `v2-ci` run 40908302516 and `cli-ci` run 40908302553, both success.
- **Not checked**:
  - The publish itself. `cli-release` runs only on the `v0.29.0` tag, which waits for the human's approval.
  - An upgrade from a published 0.28.0 install with `npx @angelkurten/specforge@0.29.0 update`.
- **Deviations from the contract**:
  - **Premise line.** Reworded after `loop.py` refused it. The content did not change. It is the same format slip as in change `2026-10-26-sibling-repos`.
