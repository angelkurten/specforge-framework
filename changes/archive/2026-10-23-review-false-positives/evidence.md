## Evidence

- **Ran**:
  - `python3 scripts/review_fp_test.py` before implementation: scenarios 1, 2, 3 and 5 failed. Scenarios 4 and 6 already passed; they are regression guards for behaviour that must survive. A human approved all 6, and they were locked.
  - `python3 scripts/review_fp_test.py` after implementation: 6 of 6 pass. `python3 scripts/review_test.py` (locked): 8 of 8 pass. `lock_tests.py check` exits 0 for both changes.
  - Manual: `review_prep.py` from this change, run in a worktree at `cd7e21d` with base `4378e5d` (the adversarial reviewer's own change).
- **Result**:
  - Unit suites pass.
  - Manual run: the 15 findings (11 blockers) became 4 should-fix, and the script exits 0. Three of the four are real renames of v1 CLI tests, now reported as "renamed?" as scenario 5 intends. The fourth is a false positive that remains: `throw new Error('not implemented')` inside a fixture string at `scripts/review_test.py:133`.
- **Not checked**:
  - The manual criterion "none of the 15 false positives remain" is not fully met: 1 of 15 remains. It is the cost of locked scenario 5 in `review_test.py`, which requires a thrown not-implemented message to report even though it sits inside a string. The script cannot tell a fixture string from real code on that pattern.
  - The rename message lists every test added in the file, which is long when several are added.
- **Deviations from the contract**: none in scope. The manual criterion is met for 14 of 15, as recorded above.
