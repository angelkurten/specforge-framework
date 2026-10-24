## Evidence

- **Ran**:
  - The red phase:
    - 3 CLI test files were rewritten for `specforge/`. They add erase and update safety and a real PreToolUse registration check.
    - 7 Python suites changed only their paths; `compose_fix_test.py` needed no change.
    - All failed, and a human approved and locked them.
  - Green, `pnpm test` in `tools/cli`: 513 of 513 pass, and 514 with the review fix. The nine suites in `v2-ci.yml` pass. `node tools/cli/dist/src/cli.js doctor` on this repository reports 0 findings.
  - The reviewer's reproduction, run by hand on a throwaway folder with the built CLI. The folder had a fresh `init`, a manifest cut back to the 40 v1 entries, and the project's own `core/notes.md`, `scripts/archive.py`, `changes/2025-q3/release.md` and `DECISIONS.md`. Commands, in order: `update`, then `update --strategy=ours`, then `update`, then `init --force --erase`. All four owned files kept the same bytes, and none of them appeared in the manifest.
  - CI on `c0c125a`: `v2-ci` run 7 and `cli-ci` run 78, both green. The review fix commit's runs are read before archiving and recorded under Review.
- **Result**: pass. The green phase took 3 iterations:
  1. Two locked Python tests still asserted `rm -r changes` and `git rm -r changes` from the old layout, which my path update had missed. A human re-approved a 2-line change to `rm -r specforge/changes` and `git rm -r specforge/changes`. It was applied outside the hook and the hashes were re-registered. That is a human re-approval, recorded here.
  2. `specforge/scripts/**` bundled a local `__pycache__/`, because prepublish walks the disk. The five scripts are now listed one by one.
- **Not checked**:
  - A real v1 install upgraded in place. The reproduction above simulates one by cutting a v2 manifest down to its v1 entries. In it, `update` reported the 14 v2 files already on disk as drift. A real v1 install has none of them on disk, so `update` writes them fresh. That path is covered by the integration tests, not by this run.
  - The installed guard in a live Claude Code session of another project.
- **Deviations from the contract**:
  - Scope said `specforge/scripts/**`. The five scripts are listed one by one instead (reason under Result, iteration 2).
  - The locked-test re-approval in iteration 1 is a human act outside the loop's normal path. No mechanism for it exists yet; it is the lesson to compose.

## Review

`specforge-reviewer` on `c0c125a` returned PASS. Its namespace check found no pattern outside the prefixed namespaces, and its throwaway runs reproduced the safety this change claims, including on an install carrying the superseded v2 names.

| # | Finding | Resolution |
|---|---|---|
| S1 | `lock-guard-registered` dropped a malformed-file warning when the other settings file registered the guard | Fixed test-first in `tools/cli/tests/unit/validators/lock-guard-registered-fix.test.ts` (approved red and locked) |
| S2 | This report did not account for CI, the same gap as the superseded change | Recorded under Ran |
| nits | A stale path in the `v2-ci.yml` comment; "8 suites" (7 changed); a broken `DECISIONS.md` link; stale change paths in three source comments | Fixed |
| nit | A command that merely contains the guard's name counts as registered | Not fixed: the contract says "names the guard" |
| nit | No test pins that `__pycache__` or `*_test.py` stays out of the bundle on a clean checkout | Not fixed: the explicit list makes it structural, and the 55-file count catches an added entry |
| nit | An install made with the superseded layout silently drops its old manifest entries on `update`; nothing is overwritten or erased | Not fixed: that layout was never released (VERSION 0.27.3) |

CI after the review fixes is green: `v2-ci` run 8 and `cli-ci` run 79 on `908f4f6`, and `v2-ci` run 9 and `cli-ci` run 80 on `563a490`, which adds `compose.md`.
