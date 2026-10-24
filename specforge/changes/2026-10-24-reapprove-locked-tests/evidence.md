## Evidence

- **Ran**:
  - `python3 scripts/reapprove_test.py` before implementation: 8 of 8 failed. Scenario 1 first passed for the wrong reason: the old script rejects any unknown command with exit 2. It was tightened to require the message to name `--reason` before approval. A human approved the 8, and they were locked.
  - After implementation: 8 of 8 pass on the first green iteration. All ten suites in `v2-ci.yml` pass, `pnpm test` in `tools/cli` passes 514 of 514, and `doctor` reports 0 findings.
  - In this repository's own session, `lock_tests.py unlock` on a path that is not locked: it refused with exit 1, and the lock was unchanged.
- **Result**: pass.
- **Not checked**:
  - Whether the guard's `ask` actually showed a confirmation prompt in the live session. Scenario 7 asserts the hook's output. During the live run above, the human could not say whether a prompt appeared.
  - `ask` under `bypassPermissions`. The docs read do not say. There the hash check and the review report remain the controls.
- **Deviations from the contract**: none.
