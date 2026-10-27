# Progress

**Budget**: 8 iterations, 3 USD

## Tasks

- [ ] scripts/multi_sibling_review_test.py test_1_both_siblings_are_listed_and_named
- [ ] scripts/multi_sibling_review_test.py test_2_the_second_sibling_gets_every_check
- [ ] scripts/multi_sibling_review_test.py test_3_unequal_pairs_are_a_usage_error
- [ ] scripts/multi_sibling_review_test.py test_4_the_same_sibling_twice_is_a_usage_error
- [ ] scripts/multi_sibling_review_test.py test_5_a_bad_second_ref_names_its_sibling_and_a_symlink_normalizes
- [ ] every suite in `.github/workflows/v2-ci.yml` passes (run them as that file does)

## Blocked

## Log
- Lead: wrote the review skill's line by hand, because `.claude/` is closed to the loop (deviation). Yours is the `loop.md` § Sibling repositories line: the review flags repeat once per sibling, and the agent command takes one `--add-dir` per sibling. Use `action="append"` for `--repo` and `--repo-base`. Pairs whose counts differ are a usage error, and its message names the pairs. Two pairs that resolve to the same toplevel are a usage error naming the duplicate. Every single-pair suite (`sibling_repos_test.py` and its `_fix` files) must stay green unchanged. `pnpm test` in `tools/cli` is not in your tools; the lead runs cli-ci.
