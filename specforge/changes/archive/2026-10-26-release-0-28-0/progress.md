# Progress

**Budget**: 8 iterations, 2.50 USD

## Tasks

- [x] scripts/release_0_28_0_test.py test_1_every_version_field_reads_0_28_0
- [x] scripts/release_0_28_0_test.py test_2_the_first_changelog_heading_is_the_dated_0_28_0_entry
- [x] scripts/release_0_28_0_test.py test_3_the_entry_names_what_the_cli_now_installs
- [x] scripts/release_0_28_0_test.py test_4_the_headless_blast_radius_is_breaking_and_names_classify
- [x] scripts/migration_guide_test.py test_7_changelog_has_an_unreleased_eva_section_first
- [x] every suite in `.github/workflows/v2-ci.yml` passes (run them as that file does)

## Blocked

## Log
- Lead: test 7 of `scripts/migration_guide_test.py` was locked by the archived change `2026-10-25-migration-guide`, whose lock is no longer enforced (`specforge/scripts/lock_tests.py:120`). With the human's approval it now requires the `[0.28.0]` entry, and it is locked here. `pnpm test` in `tools/cli` is not in your tools; the lead runs cli-ci. Write the CHANGELOG entry in the style of 0.27.1-0.27.3, and state every claim about the CLI from `tools/cli/src` (partition.ts, commands/init.ts, commands/update.ts, validators/lock-guard-registered.ts).
- Iter 1: bumped VERSION, tools/cli/package.json and both npm-shrinkwrap.json version fields (3,9) 0.27.3 -> 0.28.0; `python3 scripts/release_0_28_0_test.py Release0280Tests.test_1_every_version_field_reads_0_28_0` -> OK.
- Iter 2: CHANGELOG.md `## [Unreleased]` -> `## [0.28.0] - 2026-10-26`; `python3 scripts/release_0_28_0_test.py Release0280Tests.test_2_...` -> OK.
- Iter 3: added `### Added — what the CLI now installs` to the 0.28.0 entry (claims from partition.ts, init.ts, lock-guard-registered.ts); `python3 scripts/release_0_28_0_test.py Release0280Tests.test_3_...` -> OK.
- Iter 4: added `### Headless blast radius` (BREAKING, names specforge-classify) to the 0.28.0 entry; `python3 scripts/release_0_28_0_test.py` -> 4 tests OK.
- Iter 5: `python3 scripts/migration_guide_test.py` -> 7 tests OK (test 7 requires the `[0.28.0]` entry naming EVA and the guide); no edit needed.
- Iter 6: ran all 33 suites listed in v2-ci.yml as that file does (`python3 scripts/<suite>.py`) -> every one rc=0, OK.
