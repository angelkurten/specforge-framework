# Re-approve locked tests when the design changes

**Mode**: Contract

## Outcome

When a human changes a design that approved tests encode, there is one sanctioned way to change those tests. The path is:
1. `lock_tests.py unlock` with a reason.
2. Edit the test.
3. `lock_tests.py approve` again.

Every step is recorded in the lock file, so it shows up in the diff and in review. Until the test is re-approved, nothing downstream proceeds: the loop does not run, and the change does not archive.

**The guarantee** (amended after review, by the human): no change to an approved test or to its lock reaches merge without appearing in review for a human to confirm. A hook cannot stop an agent that has a shell, since any command has another spelling. The guarantee therefore rests on the git diff, which cannot be spelled around. In Claude Code the guard also routes `unlock` to a human confirmation prompt. That prompt is an aid, not the guarantee.

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
- A reason is one line. A newline in it would forge lock or history lines.
- The guard fails closed. If a lock file cannot be read, every write is refused until the lock is fixed.
- `review_prep.py` never attributes a lock change to anyone. It reports every change to an existing lock line, and `specforge/core/review.md` requires a human to confirm each one before a PASS.

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

Added after review (`scripts/reapprove_fix_test.py`):

9. `review_prep.py` reports, as should-fix and without naming who did it:
   - an `approve` over a locked entry with no `unlock` (a changed hash);
   - a removed entry;
   - an added `# reapproved` line.
10. `loop.py` started with an unlocked entry never invokes the agent.
11. `loop.py` stops with exit 4 when an iteration changes the lock file, even if no test changed.
12. `unlock` refuses a reason containing a newline, with exit 2, and the lock is unchanged.
13. With an unreadable lock file, the guard refuses an Edit with exit 2, both to a test and to any other file.
14. `check` reports a malformed lock line with exit 1, so `archive.py` refuses.

Added after re-verification (`scripts/reapprove_fix2_test.py`). `review_prep.py` compares every lock at the base with every lock at HEAD, both read from git and paired by change name, so archiving a change does not unpair them:

15. A lock deleted in the range is reported.
16. History lines removed in the range are reported.
17. A committed re-approval is reported even when the working tree holds the old lock.
18. A re-approval and an `archive.py` move in the same range is reported.

Added in the extra round the human granted after the budget ran out (`scripts/reapprove_fix3_test.py`):

19. A second, unchanged lock under another folder with the same change name does not hide a re-approval; the duplicate is reported too.
20. A re-approval in a change whose path has non-ASCII characters is reported.
21. A duplicated history line, added or removed, is reported.

## Stop and escalate

Stop if `ask` cannot be produced without changing how the guard refuses today. Budget: 3 iterations.
