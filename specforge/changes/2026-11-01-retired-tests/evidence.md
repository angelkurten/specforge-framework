## Evidence

- **Ran**:
  - The two premise commands, by hand, before Red.
  - The 6 red tests against a draft in a scratch clone: every v2 suite and the new one passed. The clone was deleted.
  - `python3 specforge/scripts/loop.py specforge/changes/2026-11-01-retired-tests --max-iterations 8 --max-cost 3`, once, with `claude -p --output-format json --model sonnet --permission-mode acceptEdits` and `--allowedTools=Bash(python3 *),Bash(git diff *),Bash(git status *),Bash(git log *)`.
  - Every suite in `.github/workflows/v2-ci.yml`, by the lead.
- **Result**:
  - **Premises.** Both hold.
  - **Red.** Tests 1, 2, 4, 5 and 6 failed before the loop. Test 3 passed by design: it guards against matching a path with no reason.
  - **Loop.** 8 iterations, 8/8 tasks, exit 0, 2.14 USD. The fix round took 3 more iterations, 11/11 tasks, exit 0, 3.14 USD cumulative (`loop-runs.txt`). Its tests 7, 8, 9 and 11 failed first. Test 10 passed by design, since it pins the per-function downgrade. A draft passed every suite first.
  - **Fix round 2.** 1 more iteration, 12/12 tasks, exit 0, 3.57 USD cumulative. Its test failed on `f314242`, where nothing was flagged, and a draft passed every suite first.
  - **Suites.** All 54 v2 suites pass, the three `retired_tests*` suites included.
- **Exercised**: the user-visible path is the review packet, run in a scratch clone of `28803be`. A probe contract declared two retired tests: `scripts/release_0_28_0_test.py` — 0.28.0 is frozen history, and `scripts/never_deleted_test.py` — declared but kept. The range deleted `release_0_28_0_test.py`, which was declared, and `review_fp_test.py`, which was not. `review_prep.py` printed:
  - `should-fix: scripts/release_0_28_0_test.py:1 — test file retired by the contract, confirm it: 0.28.0 is frozen history`;
  - `blocker: scripts/review_fp_test.py:1 — test file deleted`;
  - `nit: …/contract.md:8 — retired test not deleted in the range: scripts/never_deleted_test.py`;
  - the foreign-lock should-fixes for both deleted files, unchanged.
  
  The probe's own evidence drew the usual CI-field blocker. The clone was deleted.
  - **Fix round**, in a scratch clone of `aa902b3`. The probe contract was committed first, and then the deletions.
    - With an uncommitted bullet for `scripts/review_fp_test.py`, the packet still printed `blocker: scripts/review_fp_test.py:1 — test file deleted`.
    - With the same bullet committed later, it printed the retired should-fix and `should-fix: …/contract.md:8 — retired entry added after the contract's first version, confirm it: scripts/review_fp_test.py`.
    - The clone was deleted.
  - **Fix round 2**, in a scratch clone of `5317fad`. The probe committed the contract, then a later bullet and the deletions, then moved the folder to `specforge/changes/archive/`. `review_prep.py` on the archived path printed both retired should-fixes and `should-fix: specforge/changes/archive/2099-01-01-probe/contract.md:8 — retired entry added after the contract's first version, confirm it: scripts/review_fp_test.py`. The clone was deleted.
- **CI**: on `5317fad`, the last code commit (fix round 2), pushed alone: `v2-ci` run 41340866788 and `cli-ci` run 41340866791, both success. On `aa902b3` (the fix round), pushed alone: `v2-ci` run 41336938827 and `cli-ci` run 41336938796, both success. On `28803be`, pushed alone: `v2-ci` run 41331686376 and `cli-ci` run 41331686292, both success.
- **Not checked**:
  - A retired entry whose path holds a space: the bullet pattern takes a path with no spaces.
- **Deviations from the contract**:
  - **Review (PASS, three should-fix, four nits).**
    - **Fixed by the fix round.** The contract was read from the working tree (scenario 7). Nothing compared against the approved contract (scenario 8). The whole-file half of scenario 2 asserted only an absence (scenario 10).
    - **Nits fixed.** HTML comments (scenario 9). The exact bullet form in the template (scenario 11).
    - **Nits accepted.** No test pins that a retired test leaves the file's other findings alone; the reviewer read the code and it holds. The progress log's "50 suites" is a miscount in the agent's log.
  - **Re-verification (PASS, one should-fix, two nits).**
    - **Should-fix, fixed by fix round 2.** The late-entry check found nothing after an archive move (scenario 12).
    - **Nits accepted.** An absolute `change` path fails safe and silent. A reason changed after approval is not reported; the human still reads it in the retired should-fix.
