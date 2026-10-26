# Migration guide from v1 to specforge EVA

**Mode**: Contract

## Outcome

A team running v1 (the PRD workflow) can move to specforge EVA by following one page. The page says what changes, what stays, the exact upgrade steps, what to do with a PRD still in `Draft`, how v1 concepts map to v2, and the known limits. README, README.es and CHANGELOG name EVA and point at the page.

## Scope

In:
- `docs/migration-v1-to-v2.md` (new), with these sections:
  - What changes;
  - What stays;
  - Upgrade;
  - In-flight PRDs;
  - v1 to v2 map;
  - Your first change;
  - Known limits.
- `mkdocs.yml`: a nav entry for the page.
- `README.md` § Upgrading and `README.es.md` § Actualización (upgrade): name specforge EVA and link the guide.
- `CHANGELOG.md`: an `## [Unreleased]` section above 0.27.3 announcing specforge EVA and linking the guide.

Out:
- Choosing or publishing a release version. That is `cli-release`'s job.
- Rewriting the rest of the README for v2.
- Deleting v1 pieces.
- Any CLI or script change.

## Context

- `tools/cli/src/partition.ts:37-49`: the v2 framework files. `:80-81` are the team data (`specforge/changes/**`, `specforge/DECISIONS.md`).
- `tools/cli/src/commands/update.ts:61,105-110`: a bundled file that is missing on disk is installed. A file on disk that is not in the manifest is drift.
- `tools/cli/src/lock-guard.ts:7-21`: the settings hook block. Only `init` prints it (`init.ts:256`); `update` does not.
- `tools/cli/src/validators/lock-guard-registered.ts`: `doctor` warns when the guard is installed but not registered.
- `specforge/core/modes.md`, `loop.md`, `review.md`, `compose.md`; `.claude/skills/specforge-*`; `specforge/DECISIONS.md` (EVA name, v2 default).
- `.github/workflows/docs.yml`: a push to `main` touching `docs/**` or `mkdocs.yml` deploys the site.

## Constraints

- Every repository path the guide names exists. Placeholders are written with `<…>`.
- The guide claims nothing about the CLI that the code above does not do.
- The pilot numbers are quoted as in `DECISIONS.md` (10 against 25 human minutes; 6.1 against 3.3 escapes per 1000 lines), with `escaped_2w` still open.
- No numbered-section PRD rules are restated; the guide links to them.

## Premises

- `update` installs a bundled file missing on disk — `grep -c 'state === "missing-locally"' tools/cli/src/commands/update.ts` → holds
- Only `init` prints the hook block, so the guide must give it to upgraders — `grep -rln SETTINGS_SNIPPET tools/cli/src` → holds
- No existing test asserts the README upgrade sections or the CHANGELOG's first heading — `grep -rln "## Upgrading" scripts tests tools/cli/tests` → holds

## Acceptance evidence

`python3 scripts/migration_guide_test.py` and every suite in `v2-ci.yml` pass:

1. `docs/migration-v1-to-v2.md` has the seven sections in Scope, in that order, and expands EVA as Evidence, Verification, Adaptation.
2. Every backticked span in the guide that is a repository path (contains `/` or ends in `.md`/`.py`/`.yml`, and has no `<`) exists in the repository.
3. The Upgrade section carries the hook block with `PreToolUse` and `.claude/hooks/specforge_lock_guard.py`, and tells the reader to run `doctor`.
4. The In-flight PRDs section says a `Draft` PRD can finish under v1 and that `Implemented` PRDs are not converted.
5. `mkdocs.yml` nav lists `migration-v1-to-v2.md`.
6. `README.md` § Upgrading and `README.es.md` § Actualización (upgrade) each name specforge EVA and link `docs/migration-v1-to-v2.md`.
7. `CHANGELOG.md` has `## [Unreleased]` before `## [0.27.3]`, naming specforge EVA and linking the guide.

## Stop and escalate

Stop and ask if the guide would need a CLI change to be true. Budget: 9 iterations, 2.50 USD, for 8 tasks (7 scenarios and the full suite).
