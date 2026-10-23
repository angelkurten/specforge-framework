## Evidence

<!-- Written after the fact, at archive time, from the report given in the session when the change landed (commit 941edfa). -->

- **Ran**:
  - `grep '^## ' templates/contract.md`: it lists exactly the six sections the brief names.
  - `wc -l templates/contract.md`: 48 lines, under the 60-line cap in this contract.
  - `node tools/cli/dist/src/cli.js doctor`: 0 findings.
- **Result**: pass.
- **Not checked**:
  - The templates in real changes: this was change 1 of 5. Five more changes have since used the contract and evidence templates.
  - `pnpm test` in `tools/cli` was not run. The 4 new templates broke 2 CLI count tests, found and fixed in the adversarial reviewer change.
- **Deviations from the contract**: none.
