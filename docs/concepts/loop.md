# Loop

Source of truth: `specforge/core/loop.md`. The `specforge-loop` skill runs it.

A change in Contract or Controlled mode is built by an agent running in a loop, and the rules that make it safe to leave running are enforced by scripts, not left as advice.

## State lives on disk

| File | Holds |
|---|---|
| `contract.md` | The intent. |
| `progress.md` | Budget, tasks, blocked line and log. |
| `locked-tests.txt` | One hash per approved test. |

Every iteration is a fresh agent process that reads the contract and the progress file and nothing else. There is no long context to degrade.

## Phases

1. **Challenge.** The contract's premises are checked and recorded.
2. **Red.** Tests are written from the acceptance evidence, they fail, and a human locks them with `lock_tests.py approve`.
3. **Green.** `loop.py` runs one task per iteration, the least code that makes it pass.
4. **Refactor.** Structural changes land in separate commits.
5. **Review.** A separate reviewer checks the diff. See [Review](review.md).

## Locked tests

An approved test is locked. The agent never edits, disables or deletes one. If a test looks wrong, or reality contradicts the contract, it writes a `BLOCKED:` line and stops. A human then fixes the contract and re-approves the test, with a reason that stays in the diff.

## Stop conditions

`loop.py` stops on the first that holds: a locked test changed, a `BLOCKED:` line, every task ticked, the cost cap, three iterations without progress, or the iteration cap. A run with no iteration cap does not start.

For code in another repository, see [Sibling projects](siblings.md).
