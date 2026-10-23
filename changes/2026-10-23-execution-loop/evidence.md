## Evidence

- **Ran**:
  - `python3 scripts/loop_test.py` before implementation: 11 of 11 failed (red). A human approved them; their hash was recorded, then locked with `scripts/lock_tests.py approve`.
  - `python3 scripts/loop_test.py` after implementation: 11 of 11 pass. The locked hash is unchanged (`785cdd4b…`); `lock_tests.py check` exits 0.
  - Live hook check in this repository's own Claude Code session: an Edit to the locked `scripts/loop_test.py` was refused with the hook's reason, and the file stayed unchanged.
  - `node tools/cli/dist/src/cli.js doctor`: 0 findings. `python3 scripts/prd_check_test.py`: passes.
- **Result**: pass. The green phase took 2 iterations. The first left 2 hook tests failing, because the hook looked for `lock_tests.py` only in the project's `scripts/`; it now also falls back to the framework copy beside the hook.
- **Not checked**:
  - `scripts/loop.py` against a real model (`claude -p`). Every driver scenario ran against a fake agent. A real run costs money and is left for the first pilot change.
  - Bash writes the hook does not pattern-match, such as `python -c "open(...).write(...)"`. By design these are caught by the hash check after the iteration, not by the hook.
  - Archiving a change folder on merge. Until that exists, this change's lock stays active and blocks edits to `scripts/loop_test.py` in this repository.
- **Deviations from the contract**: scenario 5 was narrowed before the tests were written. The hook refuses Bash commands that *write* a locked path, not every command that names one, because running a test names it too.
