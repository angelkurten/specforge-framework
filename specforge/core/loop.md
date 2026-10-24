# Loop

A change in Contract or Controlled mode is built by an agent running in a loop: explore, change, run, observe, adjust. These rules make it safe to leave running. Each is enforced by a script or a hook, not left as advice.

## State lives on disk

The change folder holds everything the loop knows:

| File | Written by | Holds |
|---|---|---|
| `contract.md` | human, agent draft | the intent ([`templates/contract.md`](../../templates/contract.md)) |
| `progress.md` | agent, every iteration | budget, tasks, blocked line, log ([`templates/progress.md`](../../templates/progress.md)) |
| `locked-tests.txt` | `specforge/scripts/lock_tests.py approve` | one hash per approved test |

Every iteration is a fresh agent process that reads `contract.md` and `progress.md` and nothing from the previous session. The context does not degrade on long tasks because there is no long context.

## Phases

1. **Red.** One context writes tests from the contract's Acceptance evidence. They must fail. A human reviews them before any implementation exists, then locks them: `python3 specforge/scripts/lock_tests.py approve <change> <test files>`. The tests become the tasks in `progress.md`, in the order they should pass.
2. **Green.** `python3 specforge/scripts/loop.py <change>` runs the implementer: one task per iteration, the least code that makes it pass, the task ticked and logged before exiting.
3. **Refactor.** Structural changes land in commits separate from behaviour changes.
4. **Review.** A separate reviewer checks the diff against the contract, and checks that the tests are not trivial or tied to the implementation. Controlled mode adds a sample of mutation testing.

Direct and Explore do not run this loop.

## Stop conditions

`specforge/scripts/loop.py` checks after every iteration and stops on the first that holds:

| Exit | Condition |
|---|---|
| 4 | An approved test changed. The hash check catches what the hook misses. |
| 5 | The agent wrote a `BLOCKED:` line: a test looks wrong, or reality contradicts the contract. |
| 0 | Every task is ticked. |
| 3 | The cost cap is passed. Cost is the summed `total_cost_usd` the agent reports. |
| 2 | 3 iterations without a new ticked task. |
| 3 | The iteration cap is reached. |

A run with no iteration cap does not start. The cap comes from the `**Budget**:` line in `progress.md`.

## No cheating

The implementer never disables tests, linters or rules, never leaves stubs, and never edits or deletes an approved test. If it believes a test is wrong, or that reality contradicts the contract, it writes `BLOCKED:` and stops. A human then either fixes the contract and re-approves the tests, or tells the agent it is wrong.

## Archiving

When a change is done, `python3 specforge/scripts/archive.py <change>` moves its folder to `specforge/changes/archive/`, as the last commit before merge. The human runs it, or asks the agent to. An archived change locks nothing.

The command refuses, and changes nothing, while the evidence report has an empty field or a locked test differs from what was approved. It also refuses when `locked-tests.txt` differs from the last commit. An uncommitted re-hash therefore cannot hide an edited test. A re-approval that was committed is accepted: re-approving is a human act, and the script cannot tell it from tampering. It shows up in the diff as a change to `locked-tests.txt`, and that diff is where review catches it. The Claude Code guard also protects `locked-tests.txt` and the folders holding one, so the only ways to change a lock are `lock_tests.py approve` and `archive.py`. A loop whose change folder moves mid-run stops with exit 4.

## Re-approving a locked test

When a human changes a design that approved tests encode, the tests change through one path:
1. `python3 specforge/scripts/lock_tests.py unlock <change> --reason "<why>" <tests>`.
2. Edit the tests.
3. `lock_tests.py approve` again.

`unlock` refuses without a reason. It records `# unlocked <date> <test>: <reason>` in `locked-tests.txt`, and `approve` adds `# reapproved <date> <test>`, so every re-approval shows in the diff. `review_prep.py` reports it as should-fix, with the reason. Until the test is re-approved, `check` reports it, so the loop does not run and the change does not archive. The Claude Code guard answers `unlock` with a confirmation prompt to a human. In a `claude -p` loop iteration nobody can answer, so the call is denied.

