# Release 0.29.0: specforge EVA from a sibling directory

**Mode**: Contract

```
MODE PROPOSAL
Risk: high — publishes @angelkurten/specforge 0.29.0 to npm; a published version cannot be reused or reverted as a unit
Uncertainty: low — the same release shape as 0.28.0, and the bump was simulated in a scratch clone
Controlled flag: no — one team, no named regime
Mode: Contract
```

Confirmed by the human, 2026-10-29.

## Outcome

The repository is ready to tag `v0.29.0`. On the tag, `cli-release` publishes, through Trusted Publishing, the CLI that ships v2's sibling support, the lock and compose checks, and the guard fixes merged since 0.28.0. The migration guide's line "`--repo` ships from 0.29.0" becomes true.

## Scope

In:
- `VERSION`, `tools/cli/package.json`, and both version fields of `tools/cli/npm-shrinkwrap.json`: 0.28.0 becomes 0.29.0.
- **`CHANGELOG.md`:** a `## [0.29.0] - 2026-10-29` entry above `[0.28.0]`, written like earlier entries. It names:
  - `review_prep.py`'s repeatable `--repo`/`--repo-base` and its report of tests locked by another change;
  - `compose_check.py`'s sibling artifacts, and `archive.py` refusing a refused `compose.md`;
  - the guard's sibling-path fix and its fail-closed exit;
  - `loop.md` § Sibling repositories;
  - the decision that v2 no longer maintains `SYSTEM_ARTIFACT.md`;
  - a `### Headless blast radius` section.
- **`.github/workflows/v2-ci.yml`:**
  - `release_0_28_0_test` leaves the suite list, retired by the human: its 0.28.0 pins fail on any later release, and the 0.28.0 entry it checked is frozen history;
  - `release_0_29_0_test` joins the list.

Out:
- The fast-forward of `main`, the tag and the publish. The lead does these after archive, with the human's approval.
- Any change to CLI source or v2 files.

## Context

- **The 0.28.0 release** (`specforge/changes/archive/2026-10-26-release-0-28-0`) touched these four files the same way.
- **The simulation** in a scratch clone with VERSION 0.29.0 and a new top entry: only `release_0_28_0_test` tests 1-2 fail, and `migration_guide_test` and its fix tests pass.
- **`tools/cli/tests/conformance/framework.test.ts`** (PRD-016 rows 12-13) already checks that `VERSION` equals the committed `package.json`, and that the newest dated entry names `VERSION` and states its headless blast radius in bold.
- **What changed since `v0.28.0`:**
  - `specforge/scripts/review_prep.py`, `compose_check.py` and `archive.py`;
  - `.claude/hooks/specforge_lock_guard.py`;
  - `specforge/core/loop.md`, `review.md` and `compose.md`;
  - `.claude/skills/specforge-loop` and `specforge-review`;
  - `templates/contract.md`;
  - `docs/migration-v1-to-v2.md`.
- **The loop skill:** a release test reads `VERSION` or stays out of permanent CI.

## Constraints

- **The headless blast radius is stated honestly.** The guard now exits 2 on any error of its own, where it used to exit 1 and let the call through. `archive.py` now refuses a change whose `compose.md` fails `compose_check`. Either can stop a headless session that used to go on. The entry carries `**BREAKING for a headless installation**` and names both.
- Semver: MINOR.
- The new release test must not fail on 0.30.0. Version fields compare against `VERSION`, and the 0.29.0 entry is found by its own heading, not as the first one.
- Every suite in `v2-ci.yml` and `cli-ci` passes.

## Premises

- Only release_0_28_0_test's first two tests fail on a bump — `python3 scripts/release_0_28_0_test.py` in the bumped scratch clone → holds
- Trusted Publishing is configured, since 0.28.0 published through it — `npm view @angelkurten/specforge@0.28.0 dist.attestations.provenance.predicateType` → holds
- No migration is needed, because team data is unchanged — `git diff --stat v0.28.0..HEAD -- tools/cli/migrations` → holds

## Acceptance evidence

`python3 scripts/release_0_29_0_test.py`, every suite in `v2-ci.yml` and `pnpm test` in `tools/cli` all pass:

1. `VERSION` is at least 0.29.0, and `tools/cli/package.json` and both shrinkwrap version fields equal `VERSION`.
2. `CHANGELOG.md` has a dated `## [0.29.0] - 2026-10-29` entry. It names `--repo`, `--repo-base`, `compose_check.py`, `archive.py`, `specforge_lock_guard.py`, `loop.md` and `SYSTEM_ARTIFACT.md`.
3. Its `### Headless blast radius` carries `**BREAKING for a headless installation**`, names the guard's exit 2, and names `archive.py`'s compose refusal.
4. `v2-ci.yml` lists `release_0_29_0_test` and no longer lists `release_0_28_0_test`.

## Stop and escalate

Stop and ask if a scenario needs a CLI source change or a migration. Budget: 8 iterations, 3 USD, for 5 tasks (4 scenarios and the full suite).
