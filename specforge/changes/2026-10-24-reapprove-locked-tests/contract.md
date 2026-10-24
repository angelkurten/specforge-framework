# Re-approve locked tests when the design changes

**Mode**: Contract

## Outcome

When a human changes a design that approved tests encode, there is one sanctioned way to change those tests. The path is:
1. `lock_tests.py unlock` with a reason.
2. Edit the test.
3. `lock_tests.py approve` again.

Every step is recorded in the lock file, so it shows up in the diff and in review. Until the test is re-approved, nothing downstream proceeds: the loop does not run, and the change does not archive. In Claude Code the guard routes `unlock` to a human confirmation prompt, so an agent cannot unlock on its own.

## Scope

In:
- `specforge/scripts/lock_tests.py`: an `unlock` command, comment lines kept as history, `approve` re-locking and recording it.
- `specforge/scripts/review_prep.py`: report unlocks in the range.
- `.claude/hooks/specforge_lock_guard.py`: answer `ask` to an `unlock` command.
- A short section in `specforge/core/loop.md`.

Out: any change to how first approvals work.

## Context

- `specforge/changes/archive/2026-10-23-specforge-namespace/evidence.md`: the two re-approvals done outside any mechanism, and the lesson.
- Claude Code hooks reference (`code.claude.com/docs/en/hooks`):
  - A PreToolUse hook prints `{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "ask", "permissionDecisionReason": …}}` on stdout and exits 0.
  - `ask` forces a prompt even in auto mode.
  - In a `-p` run, where nobody can answer, the call is denied.
- `specforge/scripts/loop.py` compares locked tests against the hashes it read before the first iteration.

## Constraints

- `unlock` refuses without a non-empty `--reason`, and refuses a path that is not currently locked. A refusal changes nothing.
- An unlocked entry counts as changed for `check`. So `archive.py` refuses, and `loop.py` stops at its first iteration.
- History lines start with `#` and are never removed by `approve`.
- Not verified: how `ask` behaves under `bypassPermissions`. There the hash check and review remain the controls.

## Acceptance evidence

`python3 scripts/reapprove_test.py` passes, and every suite in `v2-ci.yml` still passes:

1. `unlock` without `--reason` exits 2 and leaves the lock unchanged.
2. `unlock` of a path that is not locked exits 1 and leaves the lock unchanged.
3. After `unlock`:
   - the lock holds an `UNLOCKED` entry and a `# unlocked` history line carrying the reason;
   - `check` exits 1 and says the test is awaiting re-approval;
   - the guard allows an Edit to that test, and still refuses an Edit to another locked test and to the lock file.
4. `approve` after `unlock` records the new hash and a `# reapproved` line, keeps the `# unlocked` line, and `check` exits 0.
5. `archive.py` refuses while an entry is unlocked.
6. `loop.py` started with an unlocked entry stops at iteration 1 with exit 4.
7. The guard answers a Bash `lock_tests.py unlock` command with exit 0 and an `ask` decision on stdout. It still refuses with exit 2 when the same command also writes to a locked test.
8. `review_prep.py` reports an unlock in the range as should-fix, naming the test and the reason.

## Stop and escalate

Stop if `ask` cannot be produced without changing how the guard refuses today. Budget: 3 iterations.
