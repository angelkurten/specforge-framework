# Progress

**Budget**: 8 iterations, 2.50 USD

## Tasks

- [ ] scripts/release_0_28_0_test.py test_1_every_version_field_reads_0_28_0
- [ ] scripts/release_0_28_0_test.py test_2_the_first_changelog_heading_is_the_dated_0_28_0_entry
- [ ] scripts/release_0_28_0_test.py test_3_the_entry_names_what_the_cli_now_installs
- [ ] scripts/release_0_28_0_test.py test_4_the_headless_blast_radius_is_breaking_and_names_classify
- [ ] scripts/migration_guide_test.py test_7_changelog_has_an_unreleased_eva_section_first
- [ ] every suite in `.github/workflows/v2-ci.yml` passes (run them as that file does)

## Blocked

## Log
- Lead: test 7 of `scripts/migration_guide_test.py` was locked by the archived change `2026-10-25-migration-guide`, whose lock is no longer enforced (`specforge/scripts/lock_tests.py:120`). With the human's approval it now requires the `[0.28.0]` entry, and it is locked here. `pnpm test` in `tools/cli` is not in your tools; the lead runs cli-ci. Write the CHANGELOG entry in the style of 0.27.1-0.27.3, and state every claim about the CLI from `tools/cli/src` (partition.ts, commands/init.ts, commands/update.ts, validators/lock-guard-registered.ts).
