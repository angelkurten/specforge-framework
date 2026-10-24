# A symlinked lock is a blocker

**Mode**: Contract

## Outcome

A `locked-tests.txt` that is not a regular file can no longer hide a re-approval. `review_prep.py` reports it as a blocker, and `lock_tests.py check` refuses it, so the loop stops and the change does not archive. This closes the risk accepted in `specforge/DECISIONS.md` § 2026-10-24 — Accept the symlinked-lock gap until the pilot.

## Scope

In:
- `review_prep.py`: a blocker for every lock at HEAD whose git mode is not a regular file (`100644` or `100755`), and for every lock whose type changed in the range.
- `lock_tests.py check`: a finding when the change's `locked-tests.txt` in the working tree is a symlink.

Out:
- Symlinked test files. A locked test is hashed by `lock_tests.py digest`, which follows the link; that is a separate question.
- The multi-line file name noted in the same finding. Record it in compose if it still matters.
- Archived changes, whose locks are history.

## Context

- `specforge/changes/archive/2026-10-24-reapprove-locked-tests/evidence.md`: the open finding. A symlink whose target name spells the base lock text hides a re-approval; both scripts pass.
- `specforge/scripts/review_prep.py` `_locks_at` reads every lock with `git ls-tree --name-only` and `git show`, so it never sees the mode.
- `specforge/scripts/lock_tests.py` `check`, `_lines` (`lock.is_file()` follows symlinks).
- Fixtures: `scripts/archive_test.py` `Repo`, `scripts/reapprove_test.py` `Fixture`.

## Constraints

- Standard library and git only; the scripts stay offline.
- The finding is a `blocker:`, not a `should-fix:`. A symlinked lock has no legitimate use.
- Every existing suite in `.github/workflows/v2-ci.yml` still passes, and the new suite is added to it.

## Acceptance evidence

`python3 scripts/symlinked_lock_test.py` and every suite in `v2-ci.yml` pass:

1. A lock replaced by a symlink in the range, whose target name is the base lock text, is a blocker on that lock path naming `symlink`.
2. A lock added in the range as a symlink is a blocker naming `symlink`.
3. A regular-file lock, re-approved in the range, gets its usual should-fix and no `symlink` blocker. Fails against an implementation that flags every lock.
4. `lock_tests.py check` on a change whose `locked-tests.txt` is a symlink exits 1 and names `symlink`.

## Stop and escalate

Stop if the fix needs a change to an approved test of another change, or if detecting the mode needs anything beyond `git ls-tree`. Budget: 10 iterations, 5 USD.
