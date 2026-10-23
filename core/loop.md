# Loop

A change in Contract or Controlled mode is built by an agent running in a loop: explore, change, run, observe, adjust. These rules make it safe to leave running. Each is enforced by a script or a hook, not left as advice.

## State lives on disk

The change folder holds everything the loop knows:

| File | Written by | Holds |
|---|---|---|
| `contract.md` | human, agent draft | the intent ([`templates/contract.md`](../templates/contract.md)) |
| `progress.md` | agent, every iteration | budget, tasks, blocked line, log ([`templates/progress.md`](../templates/progress.md)) |
| `locked-tests.txt` | `scripts/lock_tests.py approve` | one hash per approved test |

Every iteration is a fresh agent process that reads `contract.md` and `progress.md` and nothing from the previous session. The context does not degrade on long tasks because there is no long context.

## Phases

1. **Red.** One context writes tests from the contract's Acceptance evidence. They must fail. A human reviews them before any implementation exists, then locks them: `python3 scripts/lock_tests.py approve <change> <test files>`. The tests become the tasks in `progress.md`, in the order they should pass.
2. **Green.** `python3 scripts/loop.py <change>` runs the implementer: one task per iteration, the least code that makes it pass, the task ticked and logged before exiting.
3. **Refactor.** Structural changes land in commits separate from behaviour changes.
4. **Review.** A separate reviewer checks the diff against the contract, and checks that the tests are not trivial or tied to the implementation. Controlled mode adds a sample of mutation testing.

Direct and Explore do not run this loop.

## Stop conditions

`scripts/loop.py` checks after every iteration and stops on the first that holds:

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
