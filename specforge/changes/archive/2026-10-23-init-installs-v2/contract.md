# specforge init installs v2

**Mode**: Contract

## Outcome

After `specforge init` or `update`, an adopter's repository can run the whole v2 cycle: classify, contract, loop, review, compose and archive. What the adopter owns stays theirs. `init` never writes `.claude/settings.json`; it prints the hook block to paste, and `doctor` warns while the lock guard is installed but not registered.

## Scope

In:
- `tools/cli/src/partition.ts`:
  - framework patterns for `core/**`, the five v2 scripts, `.claude/hooks/specforge_lock_guard.py` and `.claude/skills/specforge-*/**`;
  - team-data patterns for `changes/**` and `DECISIONS.md`.
- `tools/cli/src/commands/init.ts`: print the settings block.
- A new doctor validator, `lock-guard-registered`.
- The CLI tests whose bundle and manifest counts these files move.

Out:
- Removing v1 files from the bundle.
- Writing or merging `.claude/settings.json`.
- Bundling the v2 test suites (`scripts/*_test.py`, `tests/v2/`) or `.github/workflows/v2-ci.yml`, which are specforge's own.

## Context

- `tools/cli/src/partition.ts` `FRAMEWORK_FILES`: `scripts/prd-check.py` is listed as a single file so `scripts/upgrade.sh` is not dragged in. The same reasoning applies to the v2 scripts and their tests.
- `README.md`: "`init` does not write this file and `update` never touches it — settings are team data". The user confirmed this policy holds.
- `.claude/settings.json` in this repository: the hook block to print.
- `.claude/hooks/specforge_lock_guard.py` imports `scripts/lock_tests.py` from the project root, so both must be installed together.

## Constraints

- Prefixed namespaces only. `.claude/skills/specforge-*/**` claims nothing an adopter named otherwise, the same rule as `.claude/agents/specforge/`.
- `lock-guard-registered` is a warning, never an error. The loop's hash check works without the hook.
- Reading a malformed `settings.json` is a warning naming the file, never a crash.

## Acceptance evidence

`pnpm test` in `tools/cli` passes, including the new tests:

1. `classify` returns `framework` for `core/loop.md`, each of the five v2 scripts, the guard and `.claude/skills/specforge-loop/SKILL.md`.
2. `classify` returns `team` for `changes/<x>/contract.md`, `changes/archive/<x>/evidence.md` and `DECISIONS.md`.
3. `classify` does not return `framework` for `scripts/loop_test.py`, `.claude/skills/my-skill/SKILL.md`, `.claude/hooks/other.py` or `.claude/settings.json`.
4. `init` on a prepublish-built bundle installs `core/`, the five scripts, the guard and the four skills, and leaves no `.claude/settings.json`.
5. `init` prints the hook block, naming `specforge_lock_guard.py` and `PreToolUse`.
6. `lock-guard-registered` warns when the guard is installed and neither `settings.json` nor `settings.local.json` registers it.
7. It reports nothing when either file registers it, or when the guard is not installed.
8. A malformed `settings.json` produces a warning naming the file, not an exception.

`node tools/cli/dist/src/cli.js doctor` on this repository still reports 0 findings. Both CI workflows are green on the pushed head.

## Stop and escalate

Stop if bundling `.claude/skills/specforge-*/**` would claim or overwrite a path an existing v1 adopter could already own. Budget: 3 iterations.
