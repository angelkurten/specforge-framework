## Evidence

- **Ran**:
  - `python3 scripts/reapprove_test.py` before implementation: 8 of 8 failed. Scenario 1 first passed for the wrong reason: the old script rejects any unknown command with exit 2. It was tightened to require the message to name `--reason` before approval. A human approved the 8, and they were locked.
  - After implementation: 8 of 8 pass on the first green iteration. All ten suites in `v2-ci.yml` pass, `pnpm test` in `tools/cli` passes 514 of 514, and `doctor` reports 0 findings.
  - In this repository's own session, `lock_tests.py unlock` on a path that is not locked: it refused with exit 1, and the lock was unchanged.
- **Result**: pass.
- **Not checked**:
  - Whether the guard's `ask` actually showed a confirmation prompt in the live session. Scenario 7 asserts the hook's output. During the live run above, the human could not say whether a prompt appeared.
  - `ask` under `bypassPermissions`. The docs read do not say. There the hash check and the review report remain the controls.
- **Deviations from the contract**:
  - The first version did not meet the Outcome. A loop with an unlocked test invoked the agent once. The review below found this and the other bypasses, and the human amended the guarantee.
  - The review fixes changed three files the Scope did not list: `specforge/scripts/loop.py` (refuse to start, stop on a lock change), `specforge/core/review.md` (lock changes need human confirmation) and `.github/workflows/v2-ci.yml` (the new suites).

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

### Re-verification

The reviewer re-ran B1–B4 against `af04104`: all fixed under the amended guarantee, and S fixed. Its new findings:

| # | Finding | Resolution |
|---|---|---|
| N1 | blocker: a deleted lock produced no finding | The lock comparison is rewritten: every lock at the base against every lock at HEAD, read from git and paired by change name (scenario 15) |
| N2 | blocker: removed history lines produced no finding | Removed history lines are reported (16) |
| N3 | The lock was read from the working tree, so a dirty tree hid a committed re-approval | Both sides are read from git (17) |
| N4 | A re-approval and an archive move in one range went unreported | Pairing by change name follows the move (18) |
| S | `core/review.md` overclaimed; the Scope deviation was unrecorded | Both corrected |
| — | `check_locked` and test-name reading in `review_prep.py` still read the working tree | Not fixed in this change: they check the current state, which is what the loop and archive also act on |

Done test-first in `scripts/reapprove_fix2_test.py`: 4 tests, red, approved and locked. This was the third and last iteration of the budget.

### Extra round

The budget ran out with findings still open on `f3b361d`. The human chose one extra round, with no further round after it. The reviewer found N1–N4 and the Scope deviation fixed, and the `core/review.md` claim still false. It reported:

| # | Finding | Resolution |
|---|---|---|
| A | blocker: locks were keyed by folder name in a dict, so a same-named decoy lock hid a re-approval | Locks pair by canonical path, every copy is compared, and more than one lock for a change is reported (scenario 19) |
| L | blocker: git quoted non-ASCII paths, so their locks were never compared | Every git call in `review_prep.py` runs with `core.quotePath=false`, and `ls-tree` runs with `-z` (20) |
| D | should-fix: history was compared as a set, so a duplicated line went unreported | History is compared by count (21) |
| S1 | `core/review.md` overclaimed | Reworded to state what the comparison now does |

Done test-first in `scripts/reapprove_fix3_test.py`: 3 tests, red, approved and locked. All thirteen `v2-ci.yml` suites pass.

### Final re-verification and accepted risk

The reviewer re-checked `bb9a77d`: A, L, D and S1 are fixed. CI is green: `v2-ci` run 14 and `cli-ci` run 85.

One new finding remains open. It is a blocker against the amended guarantee. A `locked-tests.txt` committed as a symlink is read by `review_prep.py` as its link text, so a link whose target name spells the base lock text hides a re-approval of a weakened test. `lock_tests.py check` and `review_prep.py` both pass. The diff shows a typechange (`T`) on `locked-tests.txt` and an added file with a multi-line name, but the script does not flag them.

The budget and the one extra round were spent. On 2026-10-24 the human accepted this risk, with the reason: **it will be covered in the pilot**. It is not fixed in this change. `specforge/core/review.md` names the gap and tells the reviewer to check for a typechange on any lock, and `specforge/DECISIONS.md` records the decision with the pilot as its review point.

