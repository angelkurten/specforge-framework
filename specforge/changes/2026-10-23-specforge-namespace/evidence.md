## Evidence

- **Ran**:
  - The red phase:
    - 3 CLI test files were rewritten for `specforge/`. They add erase and update safety and a real PreToolUse registration check.
    - 8 Python suites changed only their paths.
    - All failed, and a human approved and locked them.
  - Green, `pnpm test` in `tools/cli`: 513 of 513 pass. The nine suites in `v2-ci.yml` pass. `node tools/cli/dist/src/cli.js doctor` on this repository reports 0 findings.
  - The reviewer's reproduction, run by hand on a throwaway folder with the built CLI. The folder had a fresh `init`, a manifest cut back to the 40 v1 entries, and the project's own `core/notes.md`, `scripts/archive.py`, `changes/2025-q3/release.md` and `DECISIONS.md`. Commands, in order: `update`, then `update --strategy=ours`, then `update`, then `init --force --erase`. All four owned files kept the same bytes, and none of them appeared in the manifest.
- **Result**: pass. The green phase took 3 iterations:
  1. Two locked Python tests still asserted `rm -r changes` and `git rm -r changes` from the old layout, which my path update had missed. A human re-approved a 2-line change to `rm -r specforge/changes` and `git rm -r specforge/changes`. It was applied outside the hook and the hashes were re-registered. That is a human re-approval, recorded here.
  2. `specforge/scripts/**` bundled a local `__pycache__/`, because prepublish walks the disk. The five scripts are now listed one by one.
- **Not checked**:
  - A real v1 install upgraded in place. The reproduction above simulates one by cutting a v2 manifest down to its v1 entries. In it, `update` reported the 14 v2 files already on disk as drift. A real v1 install has none of them on disk, so `update` writes them fresh. That path is covered by the integration tests, not by this run.
  - The installed guard in a live Claude Code session of another project.
- **Deviations from the contract**:
  - Scope said `specforge/scripts/**`. The five scripts are listed one by one instead (reason under Result, iteration 2).
  - The locked-test re-approval in iteration 1 is a human act outside the loop's normal path. No mechanism for it exists yet; it is the lesson to compose.
