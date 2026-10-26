## Evidence

- **Ran**:
  - The three premise commands, by hand, before Red.
  - `python3 specforge/scripts/loop.py specforge/changes/2026-10-25-migration-guide`, three times, with `claude -p --output-format json --model sonnet --permission-mode acceptEdits` and `--allowedTools=Bash(python3 *),Bash(git diff *),Bash(git status *),Bash(git log *)`.
  - `scripts/migration_guide_test.py` and `scripts/migration_guide_fix_test.py`, and every suite in `.github/workflows/v2-ci.yml`.
  - In `tools/cli`: `pnpm run build && pnpm run prepublish && pnpm test`, then `node tools/cli/dist/src/cli.js doctor --ignore-sibling=teamtasks`, by the lead.
- **Result**:
  - **Premises.** All three hold.
  - **Loop runs.**
    1. Iterations 1-8: tasks 1-8 done, exit 0. The lead then read the guide and found two placeholder sections, `specforge update`/`doctor` written without `npx @angelkurten/`, and the pilot-figures constraint unmet. The lead wrote tests 8-12, and the human approved them.
    2. Iterations 9-14: tasks 9-14 done, exit 0.
    3. Iteration 15: task 6 again, after its re-approval (see Deviations), exit 0.
  - **Totals.** 15 iterations, 4.33 USD (`loop-runs.txt`, 15 lines).
  - **Suites.** All 32 v2 suites pass.
  - **CLI.** `pnpm test` passes 514 of 514, and `doctor` reports 0 findings.
- **CI**:
  - On `bdd7457`: `v2-ci` run 40260995202 was success, and `cli-ci` run 40260995159 was **failure**. PRD-005 § 9 row 14 forbids a README link into `docs/`.
  - On `540b3a1`, the last code and test commit: `v2-ci` run 40261257265 and `cli-ci` run 40261257301, both success.
  - The pushed head that adds this report gets its own runs, read before review.
- **Not checked**:
  - `mkdocs build --strict`: `mkdocs` is not installed here, and the docs workflow runs only on `main`.
  - Whether the page URL `https://angelkurten.github.io/specforge-framework/migration-v1-to-v2/` resolves. It goes live only after the next push to `main`.
  - The guide's claim, under Known limits, that the core in `specforge/` works without `.claude/`. No test covers it.
- **Deviations from the contract**:
  - **Fix round before review.** Tests 8-12 (`scripts/migration_guide_fix_test.py`) were added after the first loop run, at the lead's request, and approved by the human.
  - **Budget.** The human raised the budget from 9 iterations and 2.50 USD to 15 iterations and 4.50 USD.
  - **Test 6 re-approved.** The locked test required a README link to `docs/migration-v1-to-v2.md`, which contradicts PRD-005 § 9 row 14. The human approved changing it to require the published URL and no `](docs/` link (`# unlocked` and `# reapproved` lines in `locked-tests.txt`). The contract's third premise had checked only the `## Upgrading` text, not the README link rules.
  - **Contract updated.** Acceptance scenario 6 now names the published URL, to match the re-approved test.
  - **Review (PASS with should-fix).**
    - The human confirmed the test-6 unlock, its re-approval and the edit to the contract's scenario 6.
    - On the human's decision, the lead fixed the version should-fix by hand: the guide and the CHANGELOG name **0.28.0** as the first CLI that ships EVA, and the guide says to check with `npx @angelkurten/specforge version`. The bump and the release itself are still to do, before the next push to `main`.
    - The lead also fixed two nits by hand: `.claude/settings.json` is not bundled (it is not team data), and `update` refreshes unedited `templates/` files.
  - **Scope.** `.github/workflows/v2-ci.yml` gained the two new suites. Scope did not declare that file (review nit).
  - **Compose, written by the lead.** The two loop-skill lines in `.claude/` and the `review.md` line.
