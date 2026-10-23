## Evidence

- **Ran**:
  - `python3 scripts/archive_test.py` before implementation: 8 of 8 failed (red). A human approved them, and they were locked.
  - `python3 scripts/archive_test.py` after implementation: 8 of 8 pass. After the review fixes, `scripts/archive_fix_test.py` passes 3 of 3, and all five suites pass. `loop_test.py` (11), `review_test.py` (8) and `review_fp_test.py` (6) still pass, all locked and unchanged.
  - `pnpm test` in `tools/cli`: 504 of 504 pass. `node tools/cli/dist/src/cli.js doctor`: 0 findings.
- **Result**: pass, on the first green iteration.
- **Not checked**:
  - Archiving the changes already on the `v2` branch. Out of scope by contract; the human decides.
  - The guard was not re-tested live in this session for the new lock-file protection; scenario 7 runs it as a subprocess.
- **Deviations from the contract**: the first version of the guard protected every ancestor folder of a locked path, including `scripts/`, `tests/` and the repository root. That went beyond Scope, which protects `locked-tests.txt`. It was fixed after review (R3 below), and the guard now protects only lock files and the folders that hold one, against removal or moving.

## Review

`specforge-reviewer`, dispatched for real on `HEAD~1...HEAD`, returned PASS with 5 should-fix findings and 1 nit. All were verified against the code, and fixed test-first in `scripts/archive_fix_test.py` (3 tests approved red and locked):

| # | Finding | Resolution |
|---|---|---|
| R1 | `scripts/loop.py`: a moved folder returned before the hash check, so an edited locked test went unreported | The loop keeps the approved hashes from before the first iteration and checks them first, even when the folder or the lock file moved (test a) |
| R2 | `scripts/archive.py`: trusted the lock file on disk, so a re-hashed lock would pass | Refuses when `locked-tests.txt` differs from the last commit (test b) |
| R3 | The guard protected every ancestor of a locked path | `rm` and `mv` of a lock file, or of a folder holding one, are refused; a destination folder is not protected (test c) |
| R4 | `evidence.md`: "Deviations: none" was wrong | Corrected above |
| R5 | `scripts/archive_test.py:128`: scenario 6 checks the rename of one of the four files | Not fixed: the test is locked. Recorded here |
| nit | `scripts/archive.py` assumes the repository root as cwd | Stated in its docstring |

### Re-verification

The reviewer re-checked `90a57bd`: R1, R2, R3, R4 and the nit are fixed, and R5 is not (locked). Its new findings:

| # | Finding | Resolution |
|---|---|---|
| R6 | The R3 fix let `git rm -r` and `git mv` of a change folder through: a regression from that fix | The guard treats `git rm` and `git mv` as `rm` and `mv`. Test-first in `scripts/guard_git_test.py` (2 tests approved red and locked) |
| R7 | `scripts/archive.py` compares the lock with HEAD only, so a re-approval that was committed archives, and an untracked lock is not compared at all | Not fixable in the script: a committed re-approval is a legitimate human act. The Outcome's absolute claim is narrowed in `core/loop.md` § Archiving to what the code does. A committed re-approval shows in the diff and is caught at review. Outside git, nothing is compared |
| nit | The guard docstring still said the loop runs `lock_tests.py check` | Corrected |

