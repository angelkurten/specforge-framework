# v1 leaves the CLI: doctor's v1 validators, --ignore-sibling and init's v1 placeholders

**Mode**: Controlled

```
MODE PROPOSAL
Risk: high — changes the CLI's public contract: 10 doctor validators and their --rule ids go, --ignore-sibling goes from accepted to unknown (exit 2), doctor's JSON changes shape (schema_version "2"), init stops creating SIBLINGS.md and ROADMAP.md, and --erase stops deleting an adopter's PRDs and ADRs
Uncertainty: low — the inventory names every site, test and ordering risk; the two ordering risks are resolved by landing them in one commit
Controlled flag: yes — DECISIONS.md 2026-10-29 puts the v1 retirement in Controlled
Mode: Controlled
```

Confirmed by the human, 2026-11-02, as change 4 of the plan to retire v1. The human chose the full removal (no deprecation period for `--ignore-sibling`, a new JSON schema version, and no v1 team-data patterns).

## Outcome

`specforge doctor` checks only what a v2 install has: the manifest, file integrity, `CLAUDE.md`'s size, the rule and agent frontmatter, and the lock guard. `init` writes no v1 placeholders and does not mistake a v1 file for an existing install. `--erase` no longer deletes an adopter's own PRDs, ADRs, `SIBLINGS.md` or `ROADMAP.md`. This repository's `SIBLINGS.md` joins the rest of v1 under `history/v1/`.

## Scope

In:
- **Validators removed, with their files and `index.ts` entries:**
  - `prd-numbering`, `prd-required-sections`, `prd-back-refs`, `prd-marketing-language`, `prd-system-artifact-diff`, `siblings-paths-resolve`, `gate-block-yaml`, `roadmap-evidence-categories`, `roadmap-pii` and `stale-briefings`;
  - the helpers `gate-fence.ts` and `roadmap-parse.ts`.
  The six that stay: `manifest-present`, `framework-file-integrity`, `claude-md-size`, `rule-frontmatter` (its `KNOWN_PATH_SCOPED` constant goes; any rule with a `paths:` list is accepted), `subagent-frontmatter`, `lock-guard-registered`.
- **`--ignore-sibling` removed:**
  - from `cli.ts` (multi-flags, usage, known flags) and `types.ts`;
  - from `commands/doctor.ts`, where the JSON drops `exclusions` and `schema_version` becomes `"2"`.
  Passing it exits 2 as an unknown flag.
- **`commands/init.ts`:**
  - no `SIBLINGS.md` or `ROADMAP.md` placeholder, so the dry run lists none and its count drops them;
  - the install probe no longer looks for `SIBLINGS.md` or a root `NNN-*.md`;
  - the next-steps line names v2 (`specforge doctor`, and the first change in the migration guide);
  - the dead `TRACKED_TEAM_DATA` goes;
  - usage and comments no longer cite PRD-003.
- **`partition.ts` `TEAM_DATA_PATTERNS`:** loses `SIBLINGS.md`, `ROADMAP.md` and the PRD, ADR and AgDR patterns, and keeps `.specforge/**`, `.specforge-source`, `.github/workflows/*`, `specforge/changes/**` and `specforge/DECISIONS.md`.
- **This repository's `SIBLINGS.md`** moves to `history/v1/SIBLINGS.md`.
  - `.github/workflows/cli-ci.yml`'s doctor step drops `--ignore-sibling` in the same commit.
  - `history/v1/README.md` says where `SIBLINGS.md` now is.
  - The migration guide no longer names it in backticks, and says that `--erase` leaves an adopter's PRDs, ADRs, `SIBLINGS.md` and `ROADMAP.md`.
- **`CHANGELOG.md`** line 7 (the team-data sentence) reworded for v2. The release entry itself is change 5.
- **`specforge/DECISIONS.md`:** one entry for this change, correcting the "12 of 17" count to 10 of 16.
- **Locked tests changed by the lead before the loop**, each through `lock_tests.py unlock --reason` and then `approve`:
  - `tools/cli/tests/integration/update-retire.test.ts` scenario 3: its team-data examples become `specforge/DECISIONS.md` and a `specforge/changes/` file;
  - `scripts/v2_site_test.py` test_1: `SIBLINGS.md` is at `history/v1/SIBLINGS.md`, not the root.
- **Tests rewritten where they pin v1:**
  - `doctor.test.ts`: the planted-violation test (a rule without frontmatter), `--rule` (with `claude-md-size`), and the all-validators list;
  - `cli.test.ts`: the `--json` shape test;
  - `init.test.ts`: the placeholders test;
  - `pack-and-run.test.ts`: the tarball layout test;
  - `partition.test.ts`: the team-data test;
  - `subagent-frontmatter.test.ts`: the 14-definition count becomes the shipped one.
  Plus `tools/cli/tests/unit/yaml.test.ts` (`new`), which holds the `!!js/function` refusal.
- **The red tests:** `tools/cli/tests/integration/v1-cli.test.ts` (`new`) and `scripts/v1_cli_test.py` (`new`, in `v2-ci`).

Out:
- The release (change 5).
- `--erase` deleting `.github/workflows/*`, and the install probe refusing a project that already has `CLAUDE.md` or `.claude/rules`. These are v2 risks the inventory found, and they need their own change.
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
- tools/cli/tests/integration/doctor.test.ts — only these tests leave it: the --ignore-sibling pass and its does-not-exist failure, the stale-briefings fires-once and stays-silent tests, and the --json exclusions.siblings test; the rest stay or are rewritten
- tools/cli/tests/unit/validators/rule-frontmatter.test.ts — only the two adr-specific path-scoped tests leave it, with the KNOWN_PATH_SCOPED constant
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
- `yaml.ts` `parseYaml` is still used by `rule-frontmatter` and `subagent-frontmatter`; its only test was in `gate-block.test.ts`.
- `review_prep.py`'s `## Retired tests` takes a path with no spaces, so the three files that keep most of their tests are declared whole, and each reason names the tests that leave.

## Constraints

- `doctor` on a fresh install exits 0, with the lock-guard warning only.
- Every locked test other than the two the lead changes stays unchanged and green.
- No new dependency.
- No literal invisible character in any written file.

## Premises

- 16 validators are registered today — `sed -n '/ALL_VALIDATORS: ReadonlyArray/,/^\];/p' tools/cli/src/validators/index.ts | grep -cE "^  [a-zA-Z]+,$"` → holds
- cli-ci passes --ignore-sibling to doctor — `grep -n "ignore-sibling" .github/workflows/cli-ci.yml` → holds

## Acceptance evidence

`tools/cli/tests/integration/v1-cli.test.ts`, `scripts/v1_cli_test.py`, `tools/cli/tests/unit/yaml.test.ts`, `pnpm --dir tools/cli test` and every suite in `v2-ci.yml` pass:

1. `ALL_VALIDATORS` lists exactly the six that stay. Each removed id makes `doctor --rule=<id>` exit 2.
2. `doctor --ignore-sibling=x` exits 2 as an unknown flag. `doctor --json` has `schema_version` `"2"` and no `exclusions` key.
3. `init` into an empty directory writes no `SIBLINGS.md` or `ROADMAP.md`, and its next-steps line names neither. `init` into a directory holding only `SIBLINGS.md`, or only `001-x.md`, is not refused as an existing install. `doctor` on the fresh install exits 0.
4. `classify` returns `unknown` for `SIBLINGS.md`, `ROADMAP.md`, `001-x.md`, `ADR-001-x.md` and `AgDR-001-x.md`, and `team` for `specforge/DECISIONS.md` and `specforge/changes/x/contract.md`. `init --force --erase` leaves a root `001-x.md` and `SIBLINGS.md` in place.
5. `parseYaml` refuses `!!js/function` without running it.
6. This repository has no root `SIBLINGS.md`, and has `history/v1/SIBLINGS.md`. `cli-ci.yml` names no `--ignore-sibling`. The guide names `--erase` leaving PRDs. `DECISIONS.md` has the entry with the 10-of-16 count.

Exercised: a real packed build in a scratch copy (`VERSION` `1.0.0-rc.2` there only), run as `init` in an empty directory, then `doctor`, `doctor --json`, `doctor --ignore-sibling=x` and `doctor --rule=prd-numbering`, and `update` over a fresh 0.30.0 install that holds an adopter's `001-x.md`, then `init --force --erase`. `v2-ci` and `cli-ci` pass on the last code commit.

## Approvals

- Mode Controlled and the full removal: the human, 2026-11-02.

## Stop and escalate

Stop and ask if `doctor` on a fresh install cannot exit 0, if a locked test other than the two named must change, or if a removed validator turns out to guard a v2 path. Budget: 20 iterations, 9 USD.
