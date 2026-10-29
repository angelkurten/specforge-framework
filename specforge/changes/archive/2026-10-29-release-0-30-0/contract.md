# Release 0.30.0: evidence that exercises the user-visible path

**Mode**: Contract

```
MODE PROPOSAL
Risk: high — publishes @angelkurten/specforge 0.30.0 to npm; a published version cannot be reused or reverted as a unit
Uncertainty: low — the same release shape as 0.28.0 and 0.29.0, and the bump was simulated in a scratch clone
Controlled flag: no — one team, no named regime
Mode: Contract
```

Confirmed by the human, 2026-10-29.

## Outcome

The repository is ready to tag `v0.30.0`. On the tag, `cli-release` publishes, through Trusted Publishing, the v2 files merged since 0.29.0. Those are review_prep's lock and CI checks, the `Exercised` evidence field with its review rule, and the reviewer's and classify's new instructions.

## Scope

In:
- `VERSION`, `tools/cli/package.json`, and both version fields of `tools/cli/npm-shrinkwrap.json`: 0.29.0 becomes 0.30.0.
- **`CHANGELOG.md`:** a `## [0.30.0] - 2026-10-29` entry above `[0.29.0]`, written like earlier entries. It names:
  - `review_prep.py`'s two should-fix checks: a lock entry added after the first approval, and a CI field that names a commit but not each repository's last code commit;
  - the `Exercised` field in `templates/evidence-report.md`, the blocker in `specforge/core/review.md`, and the review skill's new step 2;
  - the reviewer's rule to enter its scratch clone in the same command (`specforge-reviewer.md`), and classify keeping `SYSTEM_ARTIFACT.md` out of a v2 Scope;
  - a `### Headless blast radius` section.
- **`.github/workflows/v2-ci.yml`:** `release_0_30_0_test` joins the list. `release_0_29_0_test` stays, since it survives the bump.

Out:
- The fast-forward of `main`, the tag and the publish. The lead does these after archive, with the human's approval.
- Any change to CLI source or v2 files.

## Context

- **The 0.29.0 release** (`specforge/changes/archive/2026-10-29-release-0-29-0`) touched these four files the same way.
- **The simulation:** a scratch clone with `VERSION` 0.30.0, both JSON files bumped and a new top entry. All 45 suites in `v2-ci.yml` pass, `release_0_29_0_test` included.
- **`tools/cli/tests/conformance/framework.test.ts`** (PRD-016 rows 12-13) checks that `VERSION` equals `package.json`, and that the newest dated entry names `VERSION` and states its headless blast radius in bold.
- **What changed since `v0.29.0`:**
  - `specforge/scripts/review_prep.py`, `specforge/core/review.md`, `templates/evidence-report.md`, `specforge/DECISIONS.md`;
  - `.claude/skills/specforge-review`, `.claude/skills/specforge-classify`, `.claude/agents/specforge/specforge-reviewer.md`.

  Nothing under `tools/cli`.

## Constraints

- **The headless blast radius is stated honestly.** No script's exit code changes: both new review_prep findings are should-fix, and review_prep exits 1 only on a blocker. The reviewer's verdict does change. A change with a user-visible path now gets `BLOCK` if its evidence has no `Exercised` line, says `none` for that path, or leaves the path under Not checked. A headless session that gates on the verdict can now stop where it went on before. The entry carries `**BREAKING for a headless installation**` and names this.
- Semver: MINOR.
- The new release test must not fail on 0.31.0. Version fields compare against `VERSION`, and the 0.30.0 entry is found by its own heading.
- Every suite in `v2-ci.yml` and `cli-ci` passes.

## Premises

- release_0_29_0_test survives the bump, run in the bumped scratch clone — `python3 scripts/release_0_29_0_test.py` → holds
- Trusted Publishing is configured, since 0.29.0 published through it — `npm view @angelkurten/specforge@0.29.0 dist.attestations.provenance.predicateType` → holds
- No CLI change ships, so no migration is needed — `git diff --stat v0.29.0..HEAD -- tools/cli` → holds

## Acceptance evidence

`python3 scripts/release_0_30_0_test.py`, every suite in `v2-ci.yml` and `pnpm test` in `tools/cli` all pass:

1. `VERSION` is at least 0.30.0, and `tools/cli/package.json` and both shrinkwrap version fields equal `VERSION`.
2. `CHANGELOG.md` has a dated `## [0.30.0] - 2026-10-29` entry. It names `review_prep.py`, `Exercised`, `evidence-report.md`, `review.md`, `specforge-reviewer.md` and `SYSTEM_ARTIFACT.md`.
3. Its `### Headless blast radius` carries `**BREAKING for a headless installation**`, names `Exercised` and `BLOCK`, and says no exit code changes.
4. `v2-ci.yml` lists both `release_0_30_0_test` and `release_0_29_0_test`.

## Stop and escalate

Stop and ask if a scenario needs a CLI source change or a migration. Budget: 8 iterations, 3 USD, for 5 tasks (4 scenarios and the full suite).
