# Run v2 from the specforge sibling against a code sibling

**Mode**: Contract

```
MODE PROPOSAL
Risk: low — no schema, auth, payments, PII or one-way effect; review tooling, the guard's error path and docs, all revertible
Uncertainty: low — the Explore answered where change folders live, how the range is passed and where the hook runs; --add-dir is documented
Controlled flag: no — one team, no named regime
Mode: Contract
```

Confirmed by the human, 2026-10-26, reclassified from the Explore of the same day.

## Outcome

A team that keeps specforge as a sibling directory can run a whole v2 change on a code sibling: classify, contract, loop, review, compose and archive. The change folder and its lock live in specforge. The code and tests live in `../<sibling>/`. The review packet now sees the sibling's diff, which it did not see before, and the lock guard fails closed on any error of its own.

## Scope

In:
- **`specforge/scripts/review_prep.py`:** `--repo <path>` and `--repo-base <ref>`, given together.
  - The sibling's range `<repo-base>...HEAD`, read with `git -C <path>`, feeds the same code checks the specforge range feeds: changed files, skip markers, stubs, invisible characters, deleted tests, removed test functions, and tests locked by another change.
  - Its paths are reported as `<path>/<file>`, the form lock entries use.
  - The packet's `Range` line names both ranges.
  - Without the flags, the packet is unchanged.
- **`.claude/hooks/specforge_lock_guard.py`:** any exception it does not already handle exits 2, with a one-line `lock guard error` message, instead of crashing with exit 1. The human chose fail-closed.
- **`specforge/core/loop.md`**, in a `## Sibling repositories` section:
  - the loop runs from specforge;
  - lock entries are `../<sibling>/...`;
  - the agent command adds `--add-dir ../<sibling>`, and `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1` so the sibling's `CLAUDE.md` loads;
  - git reads in the sibling use `git -C ../<sibling>`.
- **`templates/contract.md`:** the Context comment asks for the code sibling's path and its `CLAUDE.md`.
- **`.claude/skills/specforge-review/SKILL.md`:** pass `--repo`/`--repo-base` when the contract names a sibling.
- **`docs/migration-v1-to-v2.md`:** a `## Working on a sibling repository` section.

Out:
- Several siblings in one change. Out until a change needs it.
- Changing where `lock_tests.py`, `loop.py` or `archive.py` resolve paths. The Explore showed they already work from specforge with `../` entries.
- The `cd ../<sibling> && …` redirect that slips past the guard. The guard guards against accidents only (`specforge/DECISIONS.md`, loop-budget entry).

## Context

- **The prototype**, at `/private/tmp/claude-501/-Users-angelkurten-specforge/d5f1aee3-8fd2-45fb-955b-a66104b83fc3/scratchpad/sib`:
  - `lock_tests.py approve`/`check` worked with `../pilot/tests/proto_slug_test.py`;
  - `loop.py` ran one `claude -p` iteration and checked the hash;
  - `review_prep.py` listed only the change folder and reported "none", missing `tools/slug.py` in the sibling.
- **`specforge/scripts/review_prep.py`:**
  - `:73-75`, `changed_files`;
  - `:106`, `added_lines`;
  - `review()` and `foreign_lock_findings()`;
  - `main()`, which uses `argparse`.
- **`.claude/hooks/specforge_lock_guard.py`:** `main()`. `load_locked` already fails closed. The `relative_to` crash was fixed in `867eb54`.
- **`code.claude.com/docs/en/permissions`, read 2026-10-26:**
  - `acceptEdits` auto-accepts edits only in the working directory or additional directories;
  - `--add-dir` directories load `CLAUDE.md` only with `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1`;
  - hooks in an added directory's `.claude/settings.json` do not load.
- **Suites that read files in Scope:**
  - `scripts/review_test.py`, `review_fp_test.py`, `invisible_chars_test.py`, `foreign_lock_test.py` and `reapprove*_test.py` run `review_prep.py`;
  - `loop_test.py`, `archive_test.py` and `guard_sibling_test.py` run the guard;
  - `loop_budget_test.py`, `loop_budget_fix4_test.py` and `premise_challenge_test.py` read `loop.md`;
  - `migration_guide_test.py` and `migration_guide_fix_test.py` read the guide, and require:
    - every backticked path to exist;
    - at least 40 words per section, with no placeholder words;
    - CLI commands in the `npx @angelkurten/specforge` form.

## Constraints

- Without `--repo`, every existing suite passes unchanged.
- The guard's behaviour on every path it handles today is unchanged. Only an unhandled exception changes, from exit 1 to exit 2.
- Hard rule 16: no env dump. The guard's error message names the exception type and text, not the environment.

## Premises

- `acceptEdits` does not auto-accept an edit outside the working and additional directories — `grep -c "for paths in the working directory or \`additionalDirectories\`" /Users/angelkurten/.claude/projects/-Users-angelkurten-specforge/d5f1aee3-8fd2-45fb-955b-a66104b83fc3/tool-results/toolu_01LkP3ZmBXSWvUv7eJPEwNcc.txt` → holds
- `--add-dir` loads the sibling's `CLAUDE.md` only with the env var set — `grep -c "CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1" /Users/angelkurten/.claude/projects/-Users-angelkurten-specforge/d5f1aee3-8fd2-45fb-955b-a66104b83fc3/tool-results/toolu_01LkP3ZmBXSWvUv7eJPEwNcc.txt` → holds
- Lock entries with `../` already verify from specforge, run in the prototype clone — `python3 specforge/scripts/lock_tests.py check specforge/changes/2026-10-26-proto` → holds
- The guide tests allow an extra section beside the seven — `grep -c "if h in SECTIONS" scripts/migration_guide_test.py` → holds

## Acceptance evidence

`python3 scripts/sibling_repos_test.py`, every suite in `v2-ci.yml` and `pnpm test` in `tools/cli` all pass:

1. With `--repo ../app --repo-base <sha>`, the packet lists the sibling's changed files as `../app/<file>`, and its `Range` line names both ranges.
2. A skip marker added in the sibling's test is a blocker at `../app/<file>:<line>`. A stub added in its source is should-fix at its line.
3. A sibling test file deleted, or a test function removed from one, is a blocker at its `../app/` path.
4. A sibling test locked by another change (entry `../app/...`) and edited in the sibling range is should-fix, naming that change.
5. `--repo` without `--repo-base`, or the reverse, exits 2 with a usage error. A `--repo` that is not a git repository exits 2 naming it.
6. The guard exits 2 with a `lock guard error` line, and no traceback, on a payload that is not JSON and on an exception raised while it checks an Edit. An ordinary unlocked Edit still exits 0.
7. `loop.md` has a `## Sibling repositories` section naming `--add-dir`, `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1`, `git -C` and lock entries under `../<sibling>/`.
8. `templates/contract.md`'s Context asks for the sibling and its `CLAUDE.md`. The review skill passes `--repo` and `--repo-base` when the contract names a sibling.
9. The migration guide has a `## Working on a sibling repository` section naming `--repo`, `--add-dir` and `../<sibling>`.

## Stop and escalate

Stop and ask if `lock_tests.py`, `loop.py` or `archive.py` must change, or if the guard's handled paths would change. Budget: 14 iterations, 5 USD, for 10 tasks (9 scenarios and the full suite).
