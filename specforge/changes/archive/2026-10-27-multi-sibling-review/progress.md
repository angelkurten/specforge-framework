# Progress

**Budget**: 8 iterations, 3 USD

## Tasks

- [x] scripts/multi_sibling_review_test.py test_1_both_siblings_are_listed_and_named
- [x] scripts/multi_sibling_review_test.py test_2_the_second_sibling_gets_every_check
- [x] scripts/multi_sibling_review_test.py test_3_unequal_pairs_are_a_usage_error
- [x] scripts/multi_sibling_review_test.py test_4_the_same_sibling_twice_is_a_usage_error
- [x] scripts/multi_sibling_review_test.py test_5_a_bad_second_ref_names_its_sibling_and_a_symlink_normalizes
- [x] every suite in `.github/workflows/v2-ci.yml` passes (run them as that file does)

## Blocked

## Log
- Lead: wrote the review skill's line by hand, because `.claude/` is closed to the loop (deviation). Yours is the `loop.md` § Sibling repositories line: the review flags repeat once per sibling, and the agent command takes one `--add-dir` per sibling. Use `action="append"` for `--repo` and `--repo-base`. Pairs whose counts differ are a usage error, and its message names the pairs. Two pairs that resolve to the same toplevel are a usage error naming the duplicate. Every single-pair suite (`sibling_repos_test.py` and its `_fix` files) must stay green unchanged. `pnpm test` in `tools/cli` is not in your tools; the lead runs cli-ci.
- Iter 1: `review_prep.py` now takes a list of (repo, ref) pairs (`action="append"`, pair-count and duplicate-toplevel usage errors, per-sibling empty-range blocker). Ran `python3 scripts/multi_sibling_review_test.py` → 5 tests OK; `sibling_repos{,_fix,_fix2,_fix3}_test.py` → all OK. Tasks 2-5 already pass but are left unticked for the next iterations to confirm. Not done: `loop.md` § Sibling repositories line; `tools/cli/framework/specforge/scripts/review_prep.py` copy still differs (check how v2-ci syncs it).
- Iter 2: `python3 scripts/multi_sibling_review_test.py -v` → 5 tests OK, test_2 included; sha256 of the locked file matches locked-tests.txt.
- Iter 3: `python3 scripts/multi_sibling_review_test.py -v` (from repo root) → 5 tests OK, test_3 included; sha256 of the locked file still matches locked-tests.txt.
- Iter 4: `python3 scripts/multi_sibling_review_test.py -v` → 5 tests OK, test_4 included; sha256 of the locked file still matches locked-tests.txt.
- Iter 5: `python3 scripts/multi_sibling_review_test.py -v` → 5 tests OK, test_5 included; sha256 of the locked file still matches locked-tests.txt.
- Iter 6: ran all 40 suites from `v2-ci.yml` (`python3 scripts/<suite>.py` each, from repo root) → every exit code 0. Added the `loop.md` § Sibling repositories line (flags repeat per sibling, one `--add-dir` each). `tools/cli` copy of `review_prep.py` and `pnpm test` left to the lead.
