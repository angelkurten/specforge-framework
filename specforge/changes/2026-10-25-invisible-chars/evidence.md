## Evidence

- **Ran**:
  - The two premise commands, by hand, before Red.
  - `python3 specforge/scripts/loop.py specforge/changes/2026-10-25-invisible-chars`, once, with `claude -p --output-format json --model sonnet --permission-mode acceptEdits "--allowedTools=Bash(python3 *),Bash(git diff *),Bash(git status *),Bash(git log *)"`.
  - Every suite in `.github/workflows/v2-ci.yml`, and `lock_tests.py check`.
- **Result**:
  - **Premises.** Both hold.
  - **Loop.** Exit 0, 8/8 tasks in 8 iterations, 1.55 USD (`loop-runs.txt`, 8 lines).
  - **Suites.** All 27 pass, `invisible_chars_test` included.
  - **Lock check.** `lock_tests.py check` → exit 0.
  - **The `splitlines` fix.** The loop also replaced `splitlines()` with `split("\n")` in `added_lines`. `splitlines` splits on U+2028, so scenario 6's character would never have reached a line.
- **CI**: GitHub Actions `v2-ci` run 40238242771 on `4e1a52b`, the last code commit: success. The pushed head that adds this report gets its own run, read before review.
- **Not checked**:
  - Characters outside category `Cf`, such as default-ignorable letters (U+3164) and variation selectors, as the contract's Out list says.
  - Files that are not UTF-8: `git diff` text decoding is unchanged.
- **Self-check.** `review_prep.py` on this change flagged a literal U+202E in two lines of this contract, where the lead had typed the escape and the file tool decoded it. The contract was corrected. `review_prep.py:11` is flagged as a stub: the docstring line that names `TODO` sits inside a triple-quoted string opened outside the hunk, which is a false positive of the existing stub pattern.
- **Deviations from the contract**: none. The `splitlines` change is inside `added_lines`, which the contract names as the input.
