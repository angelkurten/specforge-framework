# v1 leaves the CLI: doctor's v1 validators, --ignore-sibling and init's v1 placeholders

**Mode**: Controlled

```
MODE PROPOSAL
Risk: high — changes the CLI's public contract: 9 doctor validators and their --rule ids go, --ignore-sibling goes from accepted to unknown (exit 2), doctor's JSON changes shape (schema_version "2"), init stops creating SIBLINGS.md and ROADMAP.md, and --erase stops deleting an adopter's PRDs and ADRs
Uncertainty: low — the inventory names every site, test and ordering risk; the two ordering risks are resolved by landing them in one commit
Controlled flag: yes — DECISIONS.md 2026-10-29 puts the v1 retirement in Controlled
Mode: Controlled
```

Confirmed by the human, 2026-11-02, as change 4 of the plan to retire v1. The human chose the full removal (no deprecation period for `--ignore-sibling`, a new JSON schema version, and no v1 team-data patterns).

## Outcome

`specforge doctor` checks only what a v2 install has: the manifest, file integrity, `CLAUDE.md`'s size, the rule and agent frontmatter, the lock guard, and stale pre-0.11 briefings beside the v2 reviewer. `init` writes no v1 placeholders, does not mistake a v1 file for an existing install, and does not overwrite a file it would ship. `--erase` no longer deletes an adopter's own PRDs, ADRs, `SIBLINGS.md` or `ROADMAP.md`. This repository's `SIBLINGS.md` joins the rest of v1 under `history/v1/`.

## Scope

In:
- **Validators removed, with their files and `index.ts` entries:**
  - `prd-numbering`, `prd-required-sections`, `prd-back-refs`, `prd-marketing-language`, `prd-system-artifact-diff`, `siblings-paths-resolve`, `gate-block-yaml`, `roadmap-evidence-categories` and `roadmap-pii`;
  - the helpers `gate-fence.ts` and `roadmap-parse.ts`.
  The seven that stay: `manifest-present`, `framework-file-integrity`, `claude-md-size`, `rule-frontmatter`, `subagent-frontmatter`, `lock-guard-registered` and `stale-briefings` (it fires only beside `.claude/agents/specforge/`, which v2 ships, and CHANGELOG.md:683 promises its warning).
  `rule-frontmatter` loses its `KNOWN_PATH_SCOPED` constant: a rule without `paths:` passes, a rule whose `paths:` is a YAML list passes, and a rule whose `paths:` is anything else, an empty `paths:` (null) included, is an error.
- **`--ignore-sibling` removed:**
  - from `tools/cli/src/cli.ts` (`MULTI_FLAGS`, usage, known flags) and `ignoreSiblings` from `tools/cli/src/validators/types.ts`;
  - from `commands/doctor.ts`, where the JSON drops `exclusions` and `schema_version` becomes `"2"`.
  Passing it exits 2 as an unknown flag, and `--help` no longer lists it.
- **`commands/init.ts`:**
  - no `SIBLINGS.md` or `ROADMAP.md` placeholder, so the dry run lists neither and its count is the bundled files plus the manifest;
  - the install probe no longer looks for `SIBLINGS.md` or a root `NNN-*.md`, and refuses instead when any path the bundle would write already exists. It keeps refusing on `.specforge`, `CLAUDE.md` and `.claude/rules`, and it checks every path with `lstat`, so any entry counts as existing: a file, a directory, a socket, or a symlink, dangling or not (lead's default for the security finding: without it, a v1 project holding only PRDs and its own `README.md` would have that `README.md` overwritten);
  - the next-steps line names `specforge doctor` and `/specforge-classify`, and neither `SIBLINGS.md` nor `ROADMAP.md`;
  - the dead `TRACKED_TEAM_DATA` goes;
  - `tools/cli/src/cli.ts` and `tools/cli/src/commands/init.ts` no longer cite PRD-003, in usage or comments. Other files' PRD citations are out of scope.
- **`partition.ts` `TEAM_DATA_PATTERNS`:** loses `SIBLINGS.md`, `ROADMAP.md` and the PRD, ADR and AgDR patterns, and keeps `.specforge/**`, `.specforge-source`, `.github/workflows/*`, `specforge/changes/**` and `specforge/DECISIONS.md`. `update`'s `isTeamData` guard (`tools/cli/src/commands/update.ts:178`) follows it.
- **This repository's `SIBLINGS.md`** moves to `history/v1/SIBLINGS.md`.
  - `.github/workflows/cli-ci.yml`'s doctor step drops `--ignore-sibling` in the same commit.
  - `history/v1/README.md` says `SIBLINGS.md` is in `history/v1/`, so its links resolve again, and drops the sentence saying it stays at the root.
  - The migration guide no longer names it in backticks, and says:
    - that `--erase` leaves an adopter's PRDs, ADRs, `SIBLINGS.md` and `ROADMAP.md`;
    - that `doctor --ignore-sibling` now exits 2, that the nine removed `--rule` ids are gone, and that `doctor --json` is `schema_version` `"2"` without `exclusions`;
    - (without the word placeholder, which the locked `migration_guide_fix_test` test_8 rejects)
    - that an install older than 0.11 deletes its agents directory by hand, which `doctor` warns about (the path is not written in backticks, because the locked `scripts/v1_swap_test.py` test_6 fails on a backticked path this repository lacks).
- **`CHANGELOG.md`** line 7 (the team-data sentence) reworded for v2: it names `specforge/changes/` and `specforge/DECISIONS.md`, not `SIBLINGS.md`. The release entry itself is change 5.
- **`specforge/DECISIONS.md`:** one entry for this change, correcting the "12 of doctor's 17 validators" count to 9 of 16.
- **Locked tests changed by the lead before the loop**, each through `lock_tests.py unlock --reason` and then `approve`:
  - `tools/cli/tests/integration/update-retire.test.ts` scenario 3: its team-data examples become `specforge/DECISIONS.md` and a `specforge/changes/` file;
  - `scripts/v2_site_test.py` test_1: `SIBLINGS.md` is at `history/v1/SIBLINGS.md`, not the root.
- **Tests rewritten where they pin v1:**
  - `doctor.test.ts`: the planted-violation test (a rule without frontmatter), `--rule` (with `claude-md-size`), and the all-validators list;
  - `rule-frontmatter.test.ts`: the two `adr-specific` path tests keep their assertions under a generic rule name, and the one whose fixture has no `paths:` gets `paths:` as a string instead, since a rule without `paths:` now passes;
  - `cli.test.ts`: the `--json` shape test;
  - `init.test.ts`: the placeholders test;
  - `pack-and-run.test.ts`: the tarball layout test;
  - `partition.test.ts`: the team-data test;
  - `subagent-frontmatter.test.ts`: the 14-definition count becomes `SHIPPED_DEFINITIONS.length` (1, `tools/cli/tests/helpers.ts:111`), planting `SHIPPED_DEFINITIONS` rather than the 14 v1 names.
  Plus `tools/cli/tests/unit/yaml.test.ts` (`new`): `parseYaml` throws `UnsafeYamlError` on `!!js/function`.
- **The red tests:** `tools/cli/tests/integration/v1-cli.test.ts` (`new`) and `scripts/v1_cli_test.py` (`new`, in `v2-ci`).

Out:
- The release (change 5).
- `--erase` deleting `.github/workflows/*`, and letting `init` without `--force` into a project that already has its own `CLAUDE.md` or `.claude/rules` (it refuses today and still refuses after this change). These are v2 risks the inventory found, and they need their own change.
- `migrations/0.6.0-to-0.7.0.ts` (kept; comment only).
- `scripts/upgrade.sh` (unshipped).

## Retired tests

- tools/cli/tests/unit/validators/prd-numbering.test.ts — tests the prd-numbering validator, removed with v1
- tools/cli/tests/unit/validators/prd-required-sections.test.ts — tests the prd-required-sections validator, removed with v1
- tools/cli/tests/unit/validators/prd-back-refs.test.ts — tests the prd-back-refs validator, removed with v1
- tools/cli/tests/unit/validators/prd-marketing-language.test.ts — tests the prd-marketing-language validator, removed with v1
- tools/cli/tests/unit/validators/prd-system-artifact-diff.test.ts — tests the prd-system-artifact-diff validator, removed with v1
- tools/cli/tests/unit/validators/siblings-paths.test.ts — tests the siblings-paths-resolve validator, removed with v1
- tools/cli/tests/unit/validators/roadmap-evidence-categories.test.ts — tests the roadmap-evidence-categories validator, removed with v1
- tools/cli/tests/unit/validators/roadmap-pii.test.ts — tests the roadmap-pii validator, removed with v1
- tools/cli/tests/unit/validators/gate-block.test.ts — tests the gate-block-yaml validator, removed with v1; its one general test, the !!js/function refusal, moves to tools/cli/tests/unit/yaml.test.ts
- tools/cli/tests/integration/doctor.test.ts — only these tests leave it: the --ignore-sibling pass and its does-not-exist failure, and the --json exclusions.siblings test; the rest, the stale-briefings tests included, stay or are rewritten
- tools/cli/tests/unit/validators/rule-frontmatter.test.ts — no test leaves it: the two adr-specific path-scoped tests are rewritten under a generic rule name, with the KNOWN_PATH_SCOPED constant gone
- tools/cli/tests/unit/partition.test.ts — only the PRD/ADR/AgDR team-data tests leave it (rejects non-3-digit PRD numbers, nested NNN files, ADR case sensitivity), with those patterns

## Context

- The inventory of 2026-11-02 (lead's notes) and these files:
  - `tools/cli/src/validators/index.ts` (16 validators);
  - `cli.ts` lines 27, 91, 96, 161, 208;
  - `commands/doctor.ts` lines 17, 61, 93-97;
  - `commands/init.ts` lines 35-62, 147-150, 221-251;
  - `partition.ts` `TEAM_DATA_PATTERNS`;
  - `.github/workflows/cli-ci.yml` lines 60-63.
- Ordering risks:
  - removing the `SIBLINGS.md` placeholder while `siblings-paths-resolve` stays makes doctor exit 1;
  - removing the flag while cli-ci still passes it makes CI exit 2. Both land in one commit.
- After this change an adopter's PRDs and ADRs are protected from `update` and `--erase` only because no manifest lists them and no framework glob matches them; `TEAM_DATA_PATTERNS` no longer names them.
- `yaml.ts` `parseYaml` is still used by `rule-frontmatter` and `subagent-frontmatter`; its only test was in `gate-block.test.ts`.
- `review_prep.py`'s `## Retired tests` takes a path with no spaces, so the three files that keep most of their tests are declared whole, and each reason names the tests that leave.

## Constraints

- `doctor` on a fresh install exits 0, with the lock-guard warning only.
- `tools/cli/src/validators/types.ts` is the validator types file; there is no `tools/cli/src/types.ts`.
- Every locked test other than the two the lead changes stays unchanged and green.
- No new dependency.
- No literal invisible character in any written file.

## Premises

- 16 validators are registered today — `sed -n '/ALL_VALIDATORS: ReadonlyArray/,/^\];/p' tools/cli/src/validators/index.ts | grep -cE "^  [a-zA-Z]+,$"` → holds
- cli-ci passes --ignore-sibling to doctor — `grep -n "ignore-sibling" .github/workflows/cli-ci.yml` → holds

## Acceptance evidence

`tools/cli/tests/integration/v1-cli.test.ts`, `scripts/v1_cli_test.py`, `tools/cli/tests/unit/yaml.test.ts`, `pnpm --dir tools/cli test` and every suite in `v2-ci.yml` pass:

1. `ALL_VALIDATORS` lists exactly the seven that stay. Each of the nine removed ids makes `doctor --rule=<id>` exit 2. `gate-fence.ts` and `roadmap-parse.ts` do not exist.
2. `doctor --ignore-sibling=x` exits 2 as an unknown flag, and `--help` does not mention `ignore-sibling`. `doctor --json` has `schema_version` `"2"` and no `exclusions` key. `cli.ts` has no `ignore-sibling` and `validators/types.ts` no `ignoreSiblings`.
3. `init` into an empty directory writes no `SIBLINGS.md` or `ROADMAP.md`; its next-steps line contains `specforge doctor` and `/specforge-classify` and names neither. `init --dry-run` lists neither, and its count is the bundled file count plus 1. `doctor` on the fresh install exits 0. `init.ts` has no `TRACKED_TEAM_DATA`, and neither it nor `cli.ts` contains `PRD-003`.
4. `init` into a directory holding only `SIBLINGS.md`, or only `001-x.md`, is not refused as an existing install. `init` into a directory holding only `README.md`, only `LICENSE`, only a dangling symlink at `README.md`, or only `.specforge/manifest.json` exits 2 and leaves that entry byte-identical.
5. `classify` returns `unknown` for `SIBLINGS.md`, `ROADMAP.md`, `001-x.md`, `ADR-001-x.md` and `AgDR-001-x.md`, and `team` for `specforge/DECISIONS.md` and `specforge/changes/x/contract.md`. `init --force --erase` leaves a root `001-x.md` and `SIBLINGS.md` in place.
6. `parseYaml` throws `UnsafeYamlError` on `!!js/function` without running it.
7. `rule-frontmatter` reports an error for a rule whose `paths:` is a string or empty, and none for a rule without `paths:` or with `paths:` as a list, whatever the rule's name.
8. This repository has no root `SIBLINGS.md` and has `history/v1/SIBLINGS.md`. `history/v1/README.md` names `history/v1/SIBLINGS.md` and no longer says `SIBLINGS.md` stays at the repository root. `cli-ci.yml` names no `--ignore-sibling`. `CHANGELOG.md` line 7 names `specforge/DECISIONS.md` and not `SIBLINGS.md`. The guide says `--erase` leaves PRDs, that `--ignore-sibling` exits 2, that the nine removed `--rule` ids are gone, naming each, that `schema_version` is `"2"` without `exclusions`, and that a pre-0.11 agents directory is deleted by hand. `DECISIONS.md` has the entry with the 9-of-16 count.

Exercised: a real packed build in a scratch copy (`VERSION` `1.0.0-rc.2` there only), run as `init` in an empty directory, then `doctor`, `doctor --json`, `doctor --ignore-sibling=x` and `doctor --rule=prd-numbering`, and `update` over a fresh 0.30.0 install that holds an adopter's `001-x.md`, then `init --force --erase`. `v2-ci` and `cli-ci` pass on the last code commit.

## Approvals

- Mode Controlled and the full removal: the human, 2026-11-02.
- `stale-briefings` stays, after the design-mode quality blocker: the human, 2026-11-02.

## Stop and escalate

Stop and ask if `doctor` on a fresh install cannot exit 0, if a locked test other than the two named must change, or if a removed validator turns out to guard a v2 path. Budget: 20 iterations, 9 USD.
