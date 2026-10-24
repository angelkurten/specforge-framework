## Evidence

- **Ran**: `python3 specforge/scripts/loop.py specforge/changes/2026-10-24-symlinked-lock` with `claude -p --model sonnet --permission-mode acceptEdits`, then every suite in `.github/workflows/v2-ci.yml` locally, then `lock_tests.py check` on this change.
- **Result**: loop exit 0, 5/5 tasks in 5 iterations, 1.53 USD, 2 min 20 s. All 18 suites pass, including `scripts/symlinked_lock_test.py` (4 tests). `lock_tests.py check` exit 0. A first loop run stopped with exit 2 after 3 iterations at 0.00 USD: `--allowedTools` is variadic and swallowed the prompt `loop.py` appends last; the agent command was rewritten as `--allowedTools=…`.
- **CI**: on `960102d`, `v2-ci` run 21 (id 40138368313) success; `cli-ci` run 92 (id 40138368354) success.
- **Not checked**: the four scenarios exercise `review_prep.py` and the `lock_tests.py check` command line only. No scenario runs `archive.py` or `loop.py` against a symlinked lock, so the Outcome's claim that the loop stops and the change does not archive is unverified.
- **Deviations from the contract**: none in the code. The loop's agent command needed `--allowedTools=` instead of a space-separated list; `loop.py` was not changed.
