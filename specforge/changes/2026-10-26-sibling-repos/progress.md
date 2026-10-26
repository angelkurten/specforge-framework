# Progress

**Budget**: 14 iterations, 5 USD

## Tasks

- [ ] scripts/sibling_repos_test.py test_1_the_packet_lists_sibling_files_and_names_both_ranges
- [ ] scripts/sibling_repos_test.py test_2_skip_and_stub_in_the_sibling_are_reported_at_their_lines
- [ ] scripts/sibling_repos_test.py test_3_a_deleted_sibling_test_file_or_function_is_a_blocker
- [ ] scripts/sibling_repos_test.py test_4_a_sibling_test_locked_by_another_change_is_should_fix
- [ ] scripts/sibling_repos_test.py test_5_the_flags_go_together_and_repo_must_be_a_git_repository
- [ ] scripts/sibling_repos_test.py test_6_an_unhandled_error_exits_2_without_a_traceback
- [ ] scripts/sibling_repos_test.py test_7_loop_md_describes_sibling_repositories
- [ ] scripts/sibling_repos_test.py test_8_contract_template_and_review_skill_name_the_sibling
- [ ] scripts/sibling_repos_test.py test_9_the_guide_has_a_sibling_section
- [ ] every suite in `.github/workflows/v2-ci.yml` passes (run them as that file does)

## Blocked

## Log
- Lead: a `claude -p` loop cannot write under `.claude/`, so the lead wrote two things by hand, as the human agreed (deviation). First, the guard's fail-closed wrapper in `.claude/hooks/specforge_lock_guard.py`, which makes test 6 pass. Second, the review skill's `--repo`/`--repo-base` line in `.claude/skills/specforge-review/SKILL.md`, which is test 8's skill half; the template half is yours. Do not edit `.claude/`. If a task needs it, write BLOCKED.
- Lead: the guide must keep `scripts/migration_guide_test.py` and `scripts/migration_guide_fix_test.py` green. That means every backticked path exists (write placeholders with `<…>`), each section has 40 words or more with no placeholder words, and CLI commands use the `npx @angelkurten/specforge` form. `review_prep.py` without `--repo` must print exactly what it prints today. `pnpm test` in `tools/cli` is not in your tools; the lead runs cli-ci.
