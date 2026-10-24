## Evidence

- **Ran**:
  - `python3 scripts/reapprove_test.py` before implementation: 8 of 8 failed. Scenario 1 first passed for the wrong reason: the old script rejects any unknown command with exit 2. It was tightened to require the message to name `--reason` before approval. A human approved the 8, and they were locked.
  - After implementation: 8 of 8 pass on the first green iteration. All ten suites in `v2-ci.yml` pass, `pnpm test` in `tools/cli` passes 514 of 514, and `doctor` reports 0 findings.
  - In this repository's own session, `lock_tests.py unlock` on a path that is not locked: it refused with exit 1, and the lock was unchanged.
- **Result**: pass.
- **Not checked**:
  - Whether the guard's `ask` actually showed a confirmation prompt in the live session. Scenario 7 asserts the hook's output. During the live run above, the human could not say whether a prompt appeared.
  - `ask` under `bypassPermissions`. The docs read do not say. There the hash check and the review report remain the controls.
- **Deviations from the contract**: the first version did not meet the Outcome. A loop with an unlocked test invoked the agent once. The review below found this and the other bypasses, and the human amended the guarantee.

## Review

`specforge-reviewer` on `441c567` returned **BLOCK**. It found four ways for an agent to change a locked test without a human, each reproduced in throwaway repositories:

| # | Bypass | Resolution |
|---|---|---|
| B1 | `approve` straight over a locked entry: no history, no `ask`, nothing in review | `review_prep.py` reports every changed hash, every removed entry and every new history line in a modified lock, without attribution (scenario 9) |
| B2 | The loop invoked the agent once with a test a human had unlocked; the agent could edit and re-approve it | The loop refuses to start with an unlocked test (10), and stops when an iteration changes the lock file (11) |
| B3 | The guard's `ask` matched only one spelling (`un''lock`, a pipe or a variable got through) | Not fixable in a hook: an agent with a shell has another spelling for any command. The human amended the guarantee in the contract: it now rests on the reviewed git diff, and the `ask` is an aid |
| B4 | A reason with a newline forged lock lines; the guard then crashed open (exit 1) and history could be erased | A one-line reason (12), a guard that fails closed on an unreadable lock (13), and `check` and `archive.py` refusing a malformed lock (14) |
| S | The review finding attributed an unlock to a human; scenarios 6 and 7 could not catch a broken implementation | The findings are unattributed. Scenario 10 asserts that the agent never ran. Scenario 7 stays a check on the `ask` output only, and B3 records why |

The fixes were done test-first in `scripts/reapprove_fix_test.py`: 6 tests, all red, approved and locked. After the fixes, all eleven `v2-ci.yml` suites pass.

