# Progress

**Budget**: 8 iterations, 3 USD

## Tasks

- [ ] scripts/compose_siblings_test.py test_1_a_sibling_repositorys_test_is_accepted_relative_or_absolute
- [ ] scripts/compose_siblings_test.py test_2_outside_the_repository_and_its_sibling_repositories_is_refused
- [ ] scripts/compose_siblings_test.py test_3_a_missing_sibling_file_does_not_exist
- [ ] scripts/compose_siblings_test.py test_4_archive_refuses_a_compose_that_compose_check_rejects
- [ ] scripts/compose_siblings_test.py test_5_a_valid_compose_or_none_still_archives
- [ ] every suite in `.github/workflows/v2-ci.yml` passes (run them as that file does)

## Blocked

## Log
- Lead: tests 2, 3, 5 and 5b pass today, on purpose: they guard against accepting any `../` and against archive requiring a compose.md. Keep them green. A sibling repository is a directory beside the repository root, `root.parent / <name>`, that holds `.git`. Resolve the artifact first, so a symlink counts by its target. archive.py imports `problems` from compose_check.py and adds each one as a refusal `compose: <problem>`, only when `<change>/compose.md` exists. `pnpm test` in `tools/cli` is not in your tools; the lead runs cli-ci.
