# Release 0.28.0: specforge EVA

**Mode**: Contract

## Outcome

The repository is ready to tag `v0.28.0`. The `cli-release` workflow will then publish `@angelkurten/specforge@0.28.0`, the first CLI that installs specforge EVA. With that release, the migration guide's promise ("specforge EVA ships in the CLI from 0.28.0") is true.

## Scope

In:
- `VERSION`, `tools/cli/package.json` and `tools/cli/npm-shrinkwrap.json`, where the package version appears twice: 0.27.3 becomes 0.28.0.
- `CHANGELOG.md`: the `## [Unreleased]` section becomes `## [0.28.0] - 2026-10-26`. It is written like earlier entries. It names:
  - what the CLI now installs: `specforge/core/**`, the five `specforge/scripts/` files, the four `specforge-*` skills and `.claude/hooks/specforge_lock_guard.py`;
  - that `init` prints the hook block and `update` does not;
  - the `lock-guard-registered` doctor warning;
  - the migration guide;
  - a `### Headless blast radius` section.
- `scripts/migration_guide_test.py` test 7: it is unlocked and re-approved, so it requires the `[0.28.0]` entry instead of `[Unreleased]`.

Out:
- Pushing the tag, the fast-forward to `main` and the publish. The lead does these after archive, with a fresh approval from the human.
- Any change to CLI source, rules or v2 files.
- A migration file. No team-data schema changes, like 0.27.1–0.27.3, which shipped none.

## Context

- Commit `8eed94c` (0.27.3) touched exactly `CHANGELOG.md`, `VERSION`, `tools/cli/npm-shrinkwrap.json` and `tools/cli/package.json`.
- `tools/cli/tests/conformance/framework.test.ts:165-245` (PRD-016 rows 12-13):
  - `VERSION` equals the committed `package.json`;
  - the newest `## [X] - YYYY-MM-DD` entry names `VERSION`;
  - that entry states the headless blast radius in bold, either way.
- `.github/workflows/cli-release.yml`: it runs on a `v*.*.*` tag and publishes with provenance.
- `.claude/skills/specforge-classify/SKILL.md:3`: the description says to use the skill "at the start of every change".

## Constraints

- **The headless blast radius is stated honestly.** Claude Code can invoke a skill from its description. An installation with the four skills can therefore route a headless session through `specforge-classify` and the v2 cycle instead of `workflow.md`'s PRD triage. The entry carries `**BREAKING for a headless installation**` and names `specforge-classify`. It must not claim no behaviour change.
- Semver: MINOR. v1 files and rules are unchanged, and v2 is added beside them.
- Every suite in `v2-ci.yml` and `cli-ci` (`pnpm test`, `doctor --ignore-sibling=teamtasks`) passes.

## Premises

- A release needs no migration file when team data is unchanged — `git show --stat 8eed94c -- tools/cli/migrations | wc -l` → holds
- Only one locked test pins the CHANGELOG's first heading — `grep -rln "Unreleased" scripts tests tools/cli/tests` → holds
- The classify skill is description-invoked at the start of every change — `grep -c "Use at the start of every change" .claude/skills/specforge-classify/SKILL.md` → holds

## Acceptance evidence

`python3 scripts/release_0_28_0_test.py`, every suite in `v2-ci.yml`, and `pnpm test` in `tools/cli` all pass:

1. `VERSION` reads `0.28.0`, and `tools/cli/package.json` and both version fields of `tools/cli/npm-shrinkwrap.json` (top level and `packages[""]`) read `0.28.0`.
2. The first `## [` heading in `CHANGELOG.md` is `## [0.28.0] - 2026-10-26`, and no `## [Unreleased]` remains.
3. The 0.28.0 entry names specforge EVA, `specforge/core/`, `specforge_lock_guard.py`, `lock-guard-registered`, all four skills and `docs/migration-v1-to-v2.md`.
4. Its `### Headless blast radius` section carries `**BREAKING for a headless installation**` and names `specforge-classify`.
5. `scripts/migration_guide_test.py` test 7, re-approved, requires the `[0.28.0]` entry naming EVA and the guide.

## Stop and escalate

Stop and ask if a scenario needs a CLI source change or a migration. Budget: 8 iterations, 2.50 USD, for 6 tasks (5 scenarios and the full suite).
