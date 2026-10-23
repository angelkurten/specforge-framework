# Everything v2 under specforge/

**Mode**: Contract

## Outcome

`specforge init` and `update` install the v2 cycle without claiming anything a project already owns. Everything v2 lives under one `specforge/` folder, plus the prefixed lock guard and skills. A project's own `core/`, `scripts/archive.py`, `changes/` or `DECISIONS.md` is never overwritten, recorded as framework, or erased.

## Scope

In:
- Move `core/`, the five v2 scripts, `changes/` (with `archive/`) and `DECISIONS.md` under `specforge/`, as `specforge/core/`, `specforge/scripts/`, `specforge/changes/` and `specforge/DECISIONS.md`.
- Update every reference to those paths in the scripts, the guard, the skills, `core/`, `templates/` and `.github/workflows/v2-ci.yml`.
- `tools/cli/src/partition.ts`: framework `specforge/core/**`, `specforge/scripts/**`, the guard and the four skills; team data `specforge/changes/**` and `specforge/DECISIONS.md`.
- Re-land the superseded change's printed hook block and `lock-guard-registered` validator, with its review findings fixed:
  - registration means a `PreToolUse` hook whose command names the guard;
  - JSON `null` is not reported as invalid JSON.
- The Python suites' paths, and the CLI tests' counts.

Out:
- Archived change folders keep their text. Their paths are history.
- v1 files and the v1 test layout (`scripts/prd-check.py`, `scripts/*_test.py`) stay where they are.

## Context

- `specforge/changes/archive/2026-10-23-init-installs-v2/evidence.md` (after the move): the BLOCK, reproduced on throwaway copies.
- `tools/cli/scripts/prepublish.ts` `resolveEntry`: `**` is resolved only at the end of a pattern.
- `README.md`: settings are team data; `init` never writes `.claude/settings.json`.

## Constraints

- One prefixed namespace. No framework or team-data pattern may match a path outside `specforge/`, `.claude/agents/specforge/`, `.claude/hooks/specforge_*` or `.claude/skills/specforge-*`, apart from the v1 entries that predate v2.
- `git mv`, so history follows the files.
- The Python suites change only their paths. Every assertion stays as approved.

## Acceptance evidence

`pnpm test` in `tools/cli` and every suite in `v2-ci.yml` pass, including:

1. `classify` returns `framework` for `specforge/core/loop.md`, `specforge/scripts/loop.py`, the guard and `.claude/skills/specforge-loop/SKILL.md`.
2. `classify` returns `team` for `specforge/changes/<x>/contract.md`, `specforge/changes/archive/<x>/evidence.md` and `specforge/DECISIONS.md`.
3. `classify` returns neither `framework` nor `team` for `core/notes.md`, `scripts/archive.py`, `changes/2025-q3/release.md`, `DECISIONS.md`, `scripts/loop_test.py`, `.claude/skills/my-skill/SKILL.md`, `.claude/hooks/other.py` and `.claude/settings.json`.
4. `init` installs `specforge/core/` (4 files), `specforge/scripts/` (5), the guard and the four skills; writes no `.claude/settings.json`; prints the hook block.
5. `init --force --erase` leaves a project's own `core/notes.md`, `scripts/archive.py`, `changes/2025-q3/release.md` and `DECISIONS.md` byte-identical.
6. `update` leaves a project's own `scripts/archive.py` byte-identical and out of the manifest.
7. `lock-guard-registered` warns when the guard is installed and unregistered, and is silent when it is not installed.
8. It is silent only when a `PreToolUse` hook command in `settings.json` or `settings.local.json` names the guard. A mention under `PostToolUse`, or only in a matcher, still warns.
9. A malformed `settings.json` warns naming the file; a `settings.json` holding JSON `null` warns as unregistered, not as invalid JSON.

`doctor` on this repository reports 0 findings. Both CI workflows are green on the pushed head.

## Stop and escalate

Stop if a v1 path would have to move. Budget: 3 iterations.
