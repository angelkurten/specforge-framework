## Evidence

- **Ran**:
  - The two premise commands, by hand, before Red.
  - The 6 red tests against a draft in a scratch clone: every v2 suite and the new one passed. The clone was deleted.
  - `python3 specforge/scripts/loop.py specforge/changes/2026-11-01-retired-tests --max-iterations 8 --max-cost 3`, once, with `claude -p --output-format json --model sonnet --permission-mode acceptEdits` and `--allowedTools=Bash(python3 *),Bash(git diff *),Bash(git status *),Bash(git log *)`.
  - Every suite in `.github/workflows/v2-ci.yml`, by the lead.
- **Result**:
  - **Premises.** Both hold.
  - **Red.** Tests 1, 2, 4, 5 and 6 failed before the loop. Test 3 passed by design: it guards against matching a path with no reason.
  - **Loop.** 8 iterations, 8/8 tasks, exit 0. Cost 2.14 USD (`loop-runs.txt`).
  - **Suites.** All 52 v2 suites pass, `retired_tests_test` included.
- **Exercised**: the user-visible path is the review packet, run in a scratch clone of `28803be`. A probe contract declared two retired tests: `scripts/release_0_28_0_test.py` — 0.28.0 is frozen history, and `scripts/never_deleted_test.py` — declared but kept. The range deleted `release_0_28_0_test.py`, which was declared, and `review_fp_test.py`, which was not. `review_prep.py` printed:
  - `should-fix: scripts/release_0_28_0_test.py:1 — test file retired by the contract, confirm it: 0.28.0 is frozen history`;
  - `blocker: scripts/review_fp_test.py:1 — test file deleted`;
  - `nit: …/contract.md:8 — retired test not deleted in the range: scripts/never_deleted_test.py`;
  - the foreign-lock should-fixes for both deleted files, unchanged.
  
  The probe's own evidence drew the usual CI-field blocker. The clone was deleted.
- **CI**: on `28803be`, the last code commit, pushed alone: `v2-ci` run 41331686376 and `cli-ci` run 41331686292, both success.
- **Not checked**:
  - A retired entry whose path holds a space: the bullet pattern takes a path with no spaces.
- **Deviations from the contract**:
  - **`retired_tests` reads the contract with `read_text()`**, using the locale's encoding.
