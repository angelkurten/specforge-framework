## Evidence

- **Ran**:
  - `python3 scripts/archive_test.py` before implementation: 8 of 8 failed (red). A human approved them, and they were locked.
  - `python3 scripts/archive_test.py` after implementation: 8 of 8 pass. `loop_test.py` (11), `review_test.py` (8) and `review_fp_test.py` (6) still pass, all locked and unchanged.
  - `pnpm test` in `tools/cli`: 504 of 504 pass. `node tools/cli/dist/src/cli.js doctor`: 0 findings.
- **Result**: pass, on the first green iteration.
- **Not checked**:
  - Archiving the changes already on the `v2` branch. Out of scope by contract; the human decides.
  - Because the guard treats a folder holding a lock file as protected, a Bash `cp` or `mv` into an active change folder (for example `mv draft.md changes/<active>/`) is refused. Not tested either way.
  - The guard was not re-tested live in this session for the new lock-file protection; scenario 7 runs it as a subprocess.
- **Deviations from the contract**: none.
