# Progress

**Budget**: 8 iterations, 3 USD

## Tasks

- [x] scripts/release_0_30_0_test.py test_1_version_is_at_least_0_30_0_and_every_field_agrees
- [x] scripts/release_0_30_0_test.py test_2_the_0_30_0_entry_is_dated_and_names_what_ships
- [x] scripts/release_0_30_0_test.py test_3_the_headless_blast_radius_is_breaking_and_names_the_verdict_change
- [x] scripts/release_0_30_0_test.py test_4_v2_ci_runs_this_test_and_keeps_the_0_29_0_one
- [x] every suite in `.github/workflows/v2-ci.yml` passes (the lead runs `pnpm test` in `tools/cli` after the loop: the agent may not run pnpm)

## Blocked

## Log
- Task 1: bumped VERSION, package.json and both shrinkwrap fields to 0.30.0; `python3 scripts/release_0_30_0_test.py Release0300Tests.test_1_...` → OK.
- Task 2: added the `## [0.30.0] - 2026-10-29` entry (Added/Changed sections) to CHANGELOG.md; `python3 scripts/release_0_30_0_test.py Release0300Tests.test_2_...` → OK.
- Task 3: added `### Headless blast radius` (BREAKING, Exercised, BLOCK, no exit code changes) to the 0.30.0 entry; `python3 scripts/release_0_30_0_test.py Release0300Tests.test_3_...` → OK.
- Task 4: added `release_0_30_0_test` to the suite list in `v2-ci.yml`; `python3 scripts/release_0_30_0_test.py Release0300Tests.test_4_...` → OK.
- Task 5: ran each Python suite listed in `v2-ci.yml` (`python3 scripts/<suite>.py`) → every one exited 0; `pnpm test` is left to the lead.
