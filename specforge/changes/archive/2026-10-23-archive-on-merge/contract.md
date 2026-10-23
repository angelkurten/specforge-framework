# Archive a change on merge

**Mode**: Contract

## Outcome

When a change is done, one command moves its folder to `changes/archive/`. From then on, its tests are no longer locked. The command refuses while the change could still be hiding something: an incomplete evidence report, or a locked test that differs from what was approved. An archive therefore never unlocks a test that was tampered with.

## Scope

In:
- `scripts/archive.py`.
- The lock guard also protects `locked-tests.txt` files themselves.
- `scripts/loop.py` stops cleanly if its change folder disappears mid-run.
- A short section in `core/loop.md`.

Out:
- Running the archive automatically from CI or a git hook.
- Archiving the changes already on the `v2` branch. The human decides that once the command exists.

## Context

- `scripts/lock_tests.py`: `locked_paths` reads only folders directly under `changes/`, so a folder under `changes/archive/` already locks nothing.
- `scripts/review_prep.py`: `evidence_findings` is reused for the evidence precondition.
- `.claude/hooks/specforge_lock_guard.py`: the guide that refuses edits to locked tests.
- `DECISIONS.md`, "Contracts live in a per-change folder", and "The progress file lives with the contract", which is archived with it on merge.

## Constraints

- Python 3 standard library and `git` only.
- The command is run by the human, or by the agent at the human's request, as the last commit before merge. "On merge" means that commit, not a server-side hook.
- When the folder is tracked, the move uses `git mv`, so history follows the files.
- A refusal changes nothing on disk.

## Acceptance evidence

`python3 scripts/archive_test.py` passes:

1. A change with complete evidence and unchanged locked tests moves to `changes/archive/<name>`, and the command exits 0.
2. After archiving, its tests are no longer locked: the guard allows an Edit to them.
3. Missing or incomplete evidence makes the command exit 1 and name the field; the folder stays where it was.
4. A changed locked test makes the command exit 1 and name the test; the folder stays where it was.
5. A change already archived, or an existing target, makes the command exit 1 without moving anything.
6. In a git repository, a tracked folder is moved with `git mv`, so `git status` shows renames.
7. The guard refuses Edit and Write on a `locked-tests.txt`, and Bash `rm`, `mv` or a redirection onto one.
8. `loop.py` stops with exit 4 and the reason "change folder moved" when the folder disappears during an iteration.

At the end, the `specforge-reviewer` agent is dispatched on this change for real, now that it is registered.

## Stop and escalate

Stop if protecting `locked-tests.txt` would block `lock_tests.py approve`, which a human runs on purpose. Budget: 3 iterations.
