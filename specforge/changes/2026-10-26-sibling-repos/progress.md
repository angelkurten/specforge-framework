# Progress

**Budget**: 20 iterations, 7 USD

## Tasks

- [x] scripts/sibling_repos_test.py test_1_the_packet_lists_sibling_files_and_names_both_ranges
- [x] scripts/sibling_repos_test.py test_2_skip_and_stub_in_the_sibling_are_reported_at_their_lines
- [x] scripts/sibling_repos_test.py test_3_a_deleted_sibling_test_file_or_function_is_a_blocker
- [x] scripts/sibling_repos_test.py test_4_a_sibling_test_locked_by_another_change_is_should_fix
- [x] scripts/sibling_repos_test.py test_5_the_flags_go_together_and_repo_must_be_a_git_repository
- [x] scripts/sibling_repos_test.py test_6_an_unhandled_error_exits_2_without_a_traceback
- [x] scripts/sibling_repos_test.py test_7_loop_md_describes_sibling_repositories
- [x] scripts/sibling_repos_test.py test_8_contract_template_and_review_skill_name_the_sibling
- [x] scripts/sibling_repos_test.py test_9_the_guide_has_a_sibling_section
- [x] every suite in `.github/workflows/v2-ci.yml` passes (run them as that file does)
- [x] scripts/sibling_repos_fix_test.py test_10_loop_md_gives_a_sibling_agent_command_with_literal_git_reads
- [x] every suite in `.github/workflows/v2-ci.yml` passes again, sibling_repos_fix_test included
- [x] scripts/sibling_repos_fix2_test.py test_11_an_absolute_repo_path_still_matches_lock_entries
- [x] scripts/sibling_repos_fix2_test.py test_12_a_subdirectory_or_a_bad_ref_never_crashes
- [x] scripts/sibling_repos_fix2_test.py test_13_an_empty_sibling_range_is_a_blocker
- [x] scripts/sibling_repos_fix2_test.py test_14_the_packet_tells_the_reviewer_to_read_the_sibling_diff
- [x] every suite in `.github/workflows/v2-ci.yml` passes again, sibling_repos_fix2_test included

## Blocked

## Log
- Lead: a `claude -p` loop cannot write under `.claude/`, so the lead wrote two things by hand, as the human agreed (deviation). First, the guard's fail-closed wrapper in `.claude/hooks/specforge_lock_guard.py`, which makes test 6 pass. Second, the review skill's `--repo`/`--repo-base` line in `.claude/skills/specforge-review/SKILL.md`, which is test 8's skill half; the template half is yours. Do not edit `.claude/`. If a task needs it, write BLOCKED.
- Lead: the guide must keep `scripts/migration_guide_test.py` and `scripts/migration_guide_fix_test.py` green. That means every backticked path exists (write placeholders with `<…>`), each section has 40 words or more with no placeholder words, and CLI commands use the `npx @angelkurten/specforge` form. `review_prep.py` without `--repo` must print exactly what it prints today. `pnpm test` in `tools/cli` is not in your tools; the lead runs cli-ci.
- Iter 1: `--repo`/`--repo-base` added to `review_prep.py` (sibling files as `<repo>/<file>`, Range names both); ran `python3 scripts/sibling_repos_test.py Siblings.test_1_…` → OK, and review_test, review_fp_test, invisible_chars_test, foreign_lock_test → OK.
- Iter 2: `added_lines` takes `repo` and prefixes `<repo>/`; `review()` runs invisible/skip/stub checks over the sibling's added lines; ran `python3 scripts/sibling_repos_test.py Siblings.test_2_…` → OK, and review_test, review_fp_test, invisible_chars_test, foreign_lock_test → OK.
- Iter 3: the deleted-test and removed-function checks in `review()` now also run over the sibling's range (read with `git -C`, shown as `<repo>/<file>`); ran `python3 scripts/sibling_repos_test.py Siblings.test_3_…` → OK, and review_test, review_fp_test, invisible_chars_test, foreign_lock_test → OK.
- Iter 4: `foreign_lock_findings` in `review()` now receives the sibling's files too (`files + sibling`); ran `python3 scripts/sibling_repos_test.py Siblings.test_4_…` → OK, and review_test, review_fp_test, invisible_chars_test, foreign_lock_test → OK.
- Iter 5: `main()` in `review_prep.py` rejects `--repo` without `--repo-base` (and the reverse) and a `--repo` that is not a git repository with `parser.error` (exit 2); ran `python3 scripts/sibling_repos_test.py Siblings.test_5_…` → OK, and review_test, review_fp_test, invisible_chars_test, foreign_lock_test → OK.
- Iter 6: test 6 needs no new code (the lead's guard wrapper already covers it); ran `python3 scripts/sibling_repos_test.py GuardFailsClosed` → OK, and loop_test (11 tests), guard_sibling_test (3 tests) → OK.
- Iter 7: added `## Sibling repositories` to `specforge/core/loop.md`; ran `python3 scripts/sibling_repos_test.py Docs.test_7_…` → OK, and loop_budget_test, loop_budget_fix4_test, premise_challenge_test → OK.
- Iter 8: `templates/contract.md` Context comment now asks for the sibling path and its `CLAUDE.md` (skill half was the lead's); ran `python3 scripts/sibling_repos_test.py Docs.test_8_…` → OK.
- Iter 9: added `## Working on a sibling repository` to `docs/migration-v1-to-v2.md`; ran `python3 scripts/sibling_repos_test.py Docs` (3 tests), migration_guide_test (7), migration_guide_fix_test (5) → OK.
- Iter 10: ran all 37 suites of `v2-ci.yml` as that file does (`python3 scripts/<suite>.py` in a loop) → every one exited 0; `pnpm test` in `tools/cli` is the lead's.
- Lead: fix round before review, approved by the human with the budget unchanged. `loop.md` says to read the sibling with `git -C`, but no agent command allows it. Add one full example command to § Sibling repositories, on a single line: `env CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1 claude -p ... --add-dir ../<sibling> "--allowedTools=...,Bash(git -C ../<sibling> diff *),Bash(git -C ../<sibling> status *),Bash(git -C ../<sibling> log *)"`. Name the sibling literally: never `git -C *`, whose `*` also matches `-c core.fsmonitor=<program>` (code.claude.com/docs/en/permissions, Wildcard patterns).
- Iter 11: added the full `env … claude -p … --add-dir ../<sibling>` command with literal `git -C ../<sibling>` diff/status/log rules to `loop.md` § Sibling repositories; ran `python3 scripts/sibling_repos_fix_test.py` → OK, and loop_budget_test, loop_budget_fix4_test, premise_challenge_test, sibling_repos_test → exit 0.
- Iter 12: ran all 38 suites of `v2-ci.yml` as that file does (`python3 scripts/<suite>.py` in a loop, sibling_repos_fix_test included) → every one exited 0; `pnpm test` in `tools/cli` is the lead's.
- Lead: review PASS with four should-fix in `review_prep.py`'s `--repo` path, now tests 11-14. The human approved them and raised the budget to 20 iterations, 7 USD (cumulative).
  - Normalize `--repo` once in `main()`: resolve `git -C <repo> rev-parse --show-toplevel`, then report every sibling path as `os.path.relpath(toplevel, Path.cwd().resolve())`, so `/abs/app`, `../app` and `../app/tests` all print `../app/<file>`. On macOS, tempdirs sit under a symlinked `/var`, so resolve both sides.
  - Check `--repo-base` with `git -C <toplevel> rev-parse --verify <ref>^{commit}` and refuse it through `parser.error` (exit 2), naming the ref.
  - An empty sibling range is a blocker naming the sibling and its range, like specforge's own.
  - The packet's last paragraph also names `git -C <repo> diff <repo-base>...HEAD`.
- Lead: wrote by hand two items. The guide's sibling section now says `--repo` ships from 0.29.0 (review should-fix). The `loop.md` example command is now an indented code block (review nit).
- Iter 13: `main()` in `review_prep.py` resolves `git -C <repo> rev-parse --show-toplevel` and reports the sibling as `os.path.relpath(toplevel, cwd)` (both resolved); ran `python3 scripts/sibling_repos_fix2_test.py ...test_11_…` → OK, and sibling_repos_test, review_test, review_fp_test, invisible_chars_test, foreign_lock_test → exit 0.
- Iter 14: `main()` in `review_prep.py` checks `--repo-base` with `git -C <toplevel> rev-parse --verify <ref>^{commit}` and refuses it through `parser.error` (exit 2) naming the ref; ran `python3 scripts/sibling_repos_fix2_test.py ...test_12_…` → OK, and sibling_repos_test, review_test, review_fp_test, invisible_chars_test, foreign_lock_test → exit 0.
- Iter 15: `review()` in `review_prep.py` adds a blocker naming the sibling and its range when `--repo` is given and its range is empty; ran `python3 scripts/sibling_repos_fix2_test.py` → test_13 OK (test_14 still red, next task), and sibling_repos_test, review_test, review_fp_test, invisible_chars_test, foreign_lock_test → OK.
- Iter 16: `packet()` in `review_prep.py` now names `git -C <repo> diff <repo-base>...HEAD` in the last paragraph when `--repo` is given (unchanged without it); ran `python3 scripts/sibling_repos_fix2_test.py` → OK (tests 11-14), and sibling_repos_test, review_test, review_fp_test, invisible_chars_test, foreign_lock_test → exit 0.
- Iter 17: ran all 39 suites of `v2-ci.yml` as that file does (`python3 scripts/<suite>.py` in a loop from the repo root, sibling_repos_fix2_test included) → every one exited 0; `pnpm test` in `tools/cli` is the lead's.
