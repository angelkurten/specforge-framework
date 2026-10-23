## Evidence

- **Ran**:
  - The three new test files before implementation: scenarios 1, 2, 4–5 and 6–8 failed (the validator module did not exist). Scenario 3 already passed; it is a guard against claiming too much. A human approved them, and they were locked.
  - After implementation: the 7 new tests pass, and `pnpm test` in `tools/cli` passes 511 of 511.
  - A real `specforge init --quiet` in an empty folder, from `tools/cli/dist`:
    - It installed 54 framework files, including `core/` (4), the five v2 scripts and the four skills.
    - It printed the hook block, and wrote no `.claude/settings.json`.
    - `doctor` there warned `lock-guard-registered` once.
  - `doctor` on this repository: 0 findings. Its `settings.json` registers the guard.
  - The nine Python suites in `v2-ci.yml` all pass.
- **Result**: pass. The green phase took 2 iterations. The first failed because `prepublish` resolves `**` only at the end of a pattern, so `.claude/skills/specforge-*/**` found nothing. The skills are now listed one by one.
- **Not checked**:
  - `specforge update` on an existing v1 install, apart from what the existing `update` and `doctor` integration tests cover.
  - That the installed guard works inside an adopter's live Claude Code session. Its logic is covered by the Python suites, which run against the same file.
- **Deviations from the contract**:
  - Scope said `.claude/skills/specforge-*/**`. The skills are listed one by one instead, for the reason under Result. The listing is narrower: it claims only the four skills `init` installs.
  - Three existing CLI tests changed besides the counts. `prepublish.test.ts`'s symlink fixture gains the v2 files, because a missing framework entry is fatal there. `doctor.test.ts`'s clean-install test pastes the printed hook block before running `doctor`, as a team following `init`'s instructions would; without it the new validator warns.
