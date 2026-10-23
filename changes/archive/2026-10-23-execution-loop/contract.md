# Execution loop with locked red tests

**Mode**: Contract

## Outcome

An author approves a set of failing tests for a change, and an agent then runs unattended until every task in the change's progress file is done. Each iteration starts from a clean context, the loop stops on its own at a budget or after 3 iterations without progress, and any edit to an approved test stops it.

## Scope

In:
- `core/loop.md`, the tool-agnostic rules: the progress file, the iteration protocol, the budget, the stop conditions and the TDD phases.
- `scripts/lock_tests.py`, which approves tests by recording their hashes in `locked-tests.txt` and checks them later.
- `scripts/loop.py`, the driver that runs one agent process per iteration.
- The Claude Code adapter: a PreToolUse hook that refuses edits to locked tests, registered in `.claude/settings.json`, and a `specforge-loop` skill.

Out: the adversarial reviewer (task 5), the compose command (task 6) and archiving change folders on merge.

## Context

- `core/modes.md` — Contract and Controlled are the modes that run TDD.
- `templates/contract.md` — the Acceptance evidence section the red tests come from.
- `scripts/prd-check.py` and `scripts/prd_check_test.py` — the conventions to follow: Python 3 standard library only, `unittest`, synthetic fixtures in a temp directory.

## Constraints

- Python 3 standard library only, the same as `prd-check.py`.
- The driver is agnostic. It runs whatever command `--agent` names. The Claude Code default is `claude -p --output-format json`, and the driver adds up `total_cost_usd` when an iteration prints it.
- The hook is a guide and the hash check is the sensor. The hook can be bypassed (for example a Bash `sed`), but the hash check runs after every iteration and cannot be.
- Progress counts as verifiable when the number of ticked tasks grows. The agent's own claim does not count.
- Only change folders directly under `changes/` lock tests. An archived change locks nothing.

## Acceptance evidence

`python3 scripts/loop_test.py` passes, with one test per scenario:

1. Approving tests writes one hash per file, and checking reports nothing.
2. Changing an approved test makes the check report that file.
3. The hook refuses Edit and Write on a locked path, with exit code 2 and a reason on stderr.
4. The hook allows Edit on an unlocked path.
5. The hook refuses a Bash command that writes to a locked path (redirection, in-place edit, move, copy onto it, delete, checkout), and allows one that only runs or reads it.
6. The driver exits 0 when every task is ticked.
7. The driver exits with "no progress" after 3 iterations with no new ticked task.
8. The driver exits with "budget" when it reaches the iteration cap.
9. The driver exits with "budget" when the summed `total_cost_usd` passes the cost cap.
10. The driver exits with "locked test changed" the iteration an approved test changes.
11. The driver exits with "blocked" when the agent writes a `BLOCKED:` line.

`node tools/cli/dist/src/cli.js doctor` still reports 0 findings.

## Stop and escalate

Stop and ask if a scenario cannot be tested without a real agent, or if the hook would block this repository's own work. Budget: 3 iterations.
