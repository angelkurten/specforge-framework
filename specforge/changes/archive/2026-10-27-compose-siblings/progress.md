# Progress

**Budget**: 8 iterations, 3 USD

## Tasks

- [x] scripts/compose_siblings_test.py test_1_a_sibling_repositorys_test_is_accepted_relative_or_absolute
- [x] scripts/compose_siblings_test.py test_2_outside_the_repository_and_its_sibling_repositories_is_refused
- [x] scripts/compose_siblings_test.py test_3_a_missing_sibling_file_does_not_exist
- [x] scripts/compose_siblings_test.py test_4_archive_refuses_a_compose_that_compose_check_rejects
- [x] scripts/compose_siblings_test.py test_5_a_valid_compose_or_none_still_archives
- [x] every suite in `.github/workflows/v2-ci.yml` passes (run them as that file does)

## Blocked

## Log
- Lead: tests 2, 3, 5 and 5b pass today, on purpose: they guard against accepting any `../` and against archive requiring a compose.md. Keep them green. A sibling repository is a directory beside the repository root, `root.parent / <name>`, that holds `.git`. Resolve the artifact first, so a symlink counts by its target. archive.py imports `problems` from compose_check.py and adds each one as a refusal `compose: <problem>`, only when `<change>/compose.md` exists. `pnpm test` in `tools/cli` is not in your tools; the lead runs cli-ci.
- Iter 1: compose_check.py `inside()` accepts the repo or a sibling git repo (resolved path); `python3 scripts/compose_siblings_test.py` → 5 pass, only test_4 fails (task 4, expected).
- Iter 2: task 2 needed no new code (iter 1's `inside()` covers it); `python3 scripts/compose_siblings_test.py -v` → tests 1, 2, 3, 5, 5b ok, only test_4 fails (task 4); `scripts/compose_test.py` still passes.
- Iter 3: task 3 needed no new code (`inside()` keeps the existence check); `python3 scripts/compose_siblings_test.py -v` → tests 1, 2, 3, 5, 5b ok, only test_4 fails (task 4).
- Iter 4: archive.py adds each compose_check problem as a refusal `compose: <problem>` when compose.md exists; `python3 scripts/compose_siblings_test.py` → 6 tests OK (test_4 now passes).
- Iter 5: task 5 needed no new code (iter 4 archive.py keeps valid/no-compose archiving); `python3 scripts/compose_siblings_test.py -v` → 6 tests OK.
- Iter 6: ran the 40 suites of v2-ci.yml in order with `python3 scripts/<suite>.py` → all exit 0 (none failed). `pnpm test` in tools/cli left to the lead.
