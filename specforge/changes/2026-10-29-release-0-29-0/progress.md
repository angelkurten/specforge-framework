# Progress

**Budget**: 8 iterations, 3 USD

## Tasks

- [ ] scripts/release_0_29_0_test.py test_1_version_is_at_least_0_29_0_and_every_field_agrees
- [ ] scripts/release_0_29_0_test.py test_2_the_0_29_0_entry_is_dated_and_names_what_ships
- [ ] scripts/release_0_29_0_test.py test_3_the_headless_blast_radius_is_breaking_and_names_both_refusals
- [ ] scripts/release_0_29_0_test.py test_4_v2_ci_runs_this_test_and_retires_the_0_28_0_one
- [ ] every suite in `.github/workflows/v2-ci.yml` passes (run them as that file does)

## Blocked

## Log
- Lead: bump the four version fields as the 0.28.0 release did. Write the CHANGELOG entry in the style of the 0.28.0 one, and state every claim from the code: `git diff v0.28.0..HEAD -- specforge/scripts .claude specforge/core templates docs`. In `v2-ci.yml`, replace `release_0_28_0_test` with `release_0_29_0_test`; the human retired the old one. Do not edit `scripts/release_0_28_0_test.py`. `pnpm test` in `tools/cli` is not in your tools; the lead runs cli-ci, where PRD-016 row 13 reads the committed package.json.
