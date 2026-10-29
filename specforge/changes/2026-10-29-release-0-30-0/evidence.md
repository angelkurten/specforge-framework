## Evidence

- **Ran**:
  - The three premise commands, by hand, before Red. The first ran in a scratch clone with `VERSION` 0.30.0, both JSON files bumped and a placeholder top entry, where all 45 v2 suites passed. The clone was deleted.
  - `python3 specforge/scripts/loop.py specforge/changes/2026-10-29-release-0-30-0 --max-iterations 8 --max-cost 3`, once, with `claude -p --output-format json --model sonnet --permission-mode acceptEdits` and `--allowedTools=Bash(python3 *),Bash(git diff *),Bash(git status *),Bash(git log *)`.
  - Every suite in `.github/workflows/v2-ci.yml`, by the lead.
  - After the commit, in `tools/cli`: `pnpm run build && pnpm run prepublish && pnpm test`.
- **Result**:
  - **Premises.** All three hold.
  - **Loop.** 5 iterations, 5/5 tasks, exit 0. Cost 1.57 USD (`loop-runs.txt`).
  - **Suites.** All 46 v2 suites pass, `release_0_30_0_test` and `release_0_29_0_test` included.
  - **CLI.** `pnpm test` passes 514 of 514 after the commit. Before it, row 13 of `framework.test.ts` fails as expected, because it reads the committed `package.json`.
- **Exercised**: none — a release bumps version fields and writes a changelog entry. The publish is the user-visible path, and it runs after archive, on the tag.
- **CI**: on `b10217c`, the last code commit, pushed alone: `v2-ci` run 40974757281 and `cli-ci` run 40974757459, both success.
- **Not checked**:
  - The publish itself. It runs on the `v0.30.0` tag, after archive, with the human's approval.
- **Deviations from the contract**:
  - **Changelog lines corrected by the lead.** The loop wrote that the review skill's step 2 "checks" the field; it has the lead run the path. It wrote the reviewer rule as only "enters its scratch clone"; it also forbids writing after a `cd` that may have failed. Both were corrected before the code commit, and the locked test still passes.
  - **Task 5.** `pnpm test` was moved from the loop's task to the lead before the run, because the agent's tools exclude pnpm.
