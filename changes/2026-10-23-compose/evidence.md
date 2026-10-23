## Evidence

- **Ran**:
  - `python3 scripts/compose_test.py` before implementation: 7 of 7 failed (red). A human approved them, and they were locked.
  - `python3 scripts/compose_test.py` after implementation: 7 of 7 pass on the first green iteration.
  - `python3 scripts/compose_check.py changes/2026-10-23-compose` on the real record of today's 7 lessons: exit 0.
  - GitHub Actions, `cli-ci` on `v2`: runs 63–67 failed, runs 68–71 passed. This is how the "nobody read CI" lesson was found.
- **Result**: pass.
- **Not checked**:
  - `.github/workflows/v2-ci.yml` had not run before this commit; its first run is on this push.
  - `review_prep.py` on an empty range still exits 0 without a warning. It is a known lesson with no artifact yet, so it is left out of `compose.md` rather than recorded at a rung it has not reached.
- **Deviations from the contract**: none.
