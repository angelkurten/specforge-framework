## Evidence

- **Ran**:
  - `python3 scripts/evidence_ci_test.py` before implementation: scenarios 1, 2, 4 and 5 failed. Scenario 3 already passed; it guards that a complete report is not blocked. A human approved the 5, together with the `CI` line added to the sample reports in `review_test.py` and `archive_test.py`, and they were locked.
  - After implementation: 5 of 5 pass, and all fourteen `v2-ci.yml` suites pass.
- **Result**: pass, on the first green iteration.
- **CI**: pending; filled in from the runs on the pushed head before review.
- **Not checked**: that a CI line is true. The scripts check only that the field is present and non-empty; the reviewer reads the runs (`specforge/core/review.md` § Evidence).
- **Deviations from the contract**: none.
