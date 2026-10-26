# Progress

**Budget**: 15 iterations, 4.50 USD

## Tasks

- [x] scripts/migration_guide_test.py test_1_the_guide_has_its_seven_sections_in_order_and_expands_eva
- [x] scripts/migration_guide_test.py test_2_every_repository_path_the_guide_names_exists
- [x] scripts/migration_guide_test.py test_3_upgrade_carries_the_hook_block_and_doctor
- [x] scripts/migration_guide_test.py test_4_in_flight_drafts_finish_under_v1_and_implemented_prds_stay
- [x] scripts/migration_guide_test.py test_5_mkdocs_nav_lists_the_guide
- [ ] scripts/migration_guide_test.py test_6_both_readmes_name_eva_and_link_the_guide_from_upgrading
- [x] scripts/migration_guide_test.py test_7_changelog_has_an_unreleased_eva_section_first
- [x] every suite in `.github/workflows/v2-ci.yml` passes (run them as that file does)
- [x] scripts/migration_guide_fix_test.py test_8_no_section_is_a_placeholder
- [x] scripts/migration_guide_fix_test.py test_9_first_change_walks_the_cycle_in_order
- [x] scripts/migration_guide_fix_test.py test_10_known_limits_names_what_is_still_open
- [x] scripts/migration_guide_fix_test.py test_11_cli_commands_are_written_as_npx
- [x] scripts/migration_guide_fix_test.py test_12_the_guide_quotes_the_pilot_and_names_direct_and_the_design_panel
- [x] every suite in `.github/workflows/v2-ci.yml` passes again, migration_guide_fix_test included

## Blocked

## Log
- Task 1: created `docs/migration-v1-to-v2.md` (seven sections in order, EVA expanded; bodies are placeholders for later tasks); `python3 scripts/migration_guide_test.py MigrationGuideTests.test_1_...` → OK.
- Task 2: filled What changes / What stays / v1 to v2 map in `docs/migration-v1-to-v2.md` with existing repo paths; `python3 scripts/migration_guide_test.py MigrationGuideTests.test_2_... test_1_...` → OK (2 tests).
- Task 3: wrote Upgrade section (update step, settings hook block, `specforge doctor`) in `docs/migration-v1-to-v2.md`; `python3 scripts/migration_guide_test.py MigrationGuideTests.test_3_... test_2_... test_1_...` → OK (3 tests).
- Task 4: wrote In-flight PRDs section in `docs/migration-v1-to-v2.md`; `python3 scripts/migration_guide_test.py MigrationGuideTests.test_4_... test_2_...` → OK (2 tests).
- Task 5: added `Migration from v1: migration-v1-to-v2.md` to `mkdocs.yml` nav; `python3 scripts/migration_guide_test.py MigrationGuideTests.test_5_...` → OK (1 test).
- Task 6: added specforge EVA + guide link to README.md § Upgrading and README.es.md § Actualización (upgrade); `python3 scripts/migration_guide_test.py MigrationGuideTests.test_6_...` → OK (1 test).
- Task 7: added `## [Unreleased]` (specforge EVA + guide link) above 0.27.3 in `CHANGELOG.md`; `python3 scripts/migration_guide_test.py` → OK (7 tests).
- Task 8: ran all 31 suites from `.github/workflows/v2-ci.yml` (`python3 scripts/<suite>.py` each, including `migration_guide_test`) → every one exit 0.
- Lead: fix round before review. The lead found two placeholder sections, `specforge update`/`doctor` written without `npx @angelkurten/`, and the contract's pilot-figures constraint unmet. Tests 8-12 approved and locked by the human; budget raised by the human to 15 iterations, 4.50 USD (cumulative: 7 iterations, 2 USD for this round). Also fix without a test: the Upgrade section says a clean `doctor` run means the guard is active, but `lock-guard-registered` only checks that the hook is registered; say that instead. Every number and claim must match `specforge/DECISIONS.md` and the code paths in the contract's Context.
- Task 9 (fix round, test_8): wrote Your first change and Known limits, padded What stays and the map with true content in `docs/migration-v1-to-v2.md`; `python3 scripts/migration_guide_fix_test.py MigrationGuideFixTests.test_8_...` → OK, `python3 scripts/migration_guide_test.py` → OK (7 tests).
- Task 10 (test_9): "Your first change" already walks classify → contract.md → lock_tests.py approve → loop.py → review → compose → archive.py in order; no edit needed. `python3 scripts/migration_guide_fix_test.py MigrationGuideFixTests.test_9_... test_8_...` → OK (2 tests), `python3 scripts/migration_guide_test.py` → OK (7 tests).
- Task 11 (test_10): added the `.claude/` adapter note to Known limits in `docs/migration-v1-to-v2.md`; `python3 scripts/migration_guide_fix_test.py MigrationGuideFixTests.test_10_...` → OK, `python3 scripts/migration_guide_test.py` → OK (7 tests).
- Task 12 (test_11): wrote every CLI command as `npx @angelkurten/specforge <cmd>` in `docs/migration-v1-to-v2.md`, and reworded the `doctor` line (a clean run only means the hook is registered); `python3 scripts/migration_guide_fix_test.py MigrationGuideFixTests.test_11_...` → OK, `python3 scripts/migration_guide_test.py` → OK (7 tests).
- Task 13 (test_12): added the pilot figures (10 vs 25 min, 6.1 vs 3.3 per 1000 lines), the edge test for Direct and the design panel to Known limits in `docs/migration-v1-to-v2.md`; `python3 scripts/migration_guide_fix_test.py` → OK (5 tests), `python3 scripts/migration_guide_test.py` → OK (7 tests).
- Task 14: ran all 32 suites from `.github/workflows/v2-ci.yml` (`python3 scripts/<suite>.py` each, migration_guide_fix_test included) → every one exit 0.
- Lead: cli-ci 40260995159 failed: PRD-005 § 9 row 14 (`tools/cli/tests/conformance/framework.test.ts`) forbids README links into `docs/`, because README ships to adopters without it. With the human's approval, test 6 was unlocked, changed to require https://angelkurten.github.io/specforge-framework/migration-v1-to-v2/ and no `](docs/` link, and re-approved. In the same iteration, rerun every v2-ci suite; `pnpm test` in `tools/cli` is not in your tools, so the lead runs cli-ci.
