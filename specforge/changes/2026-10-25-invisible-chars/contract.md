# Report literal invisible characters in a diff

**Mode**: Contract

## Outcome

`review_prep.py` reports every added line, in code or prose, that carries a literal invisible or bidi-control character. The finding is should-fix and names the code point, so the author writes the escape instead. The pilot found a literal U+202E in two locked test files and in a PRD, written by the file tool from `‮`, and no check saw it.

## Scope

In:
- **The finding.** For each added line in `<base>...HEAD`, prose files included, every character of Unicode category `Cf` except U+200C ZWNJ and U+200D ZWJ, plus U+2028 and U+2029, gives a should-fix. It reads `should-fix: <path>:<line> — literal invisible character U+XXXX; write the escape`, one finding per line, naming each distinct code point on it.
- **The docstring.** `review_prep.py`'s docstring lists the new should-fix.

Out:
- Rejecting such characters anywhere else (apps, PRDs, `prd-check.py`).
- Rewriting files.
- Characters outside category `Cf` (default-ignorable letters such as U+3164, variation selectors). They are known gaps from pilot PRD-019 §8 row 5.

## Context

- `specforge/scripts/review_prep.py`:
  - `:100-113` `added_lines`, every added line with its path and number, prose included;
  - `:72-98` `code_lines`, which drops prose and strings, so it is not the right input here;
  - `:242-252` `review`, where findings are collected.
- `scripts/review_test.py:47-96`: the `Repo` fixture, with `change()`, `review()` and `assertFinding()`.
- Pilot evidence:
  - `../specforge-pilot/tests/test_task_statuses.py` and `../specforge-pilot/tests/test_task_comments.py` hold a literal U+202E;
  - the PRD-019 draft held one too (`git log -p -S` on `019-teamtasks-task-comments.md`).

## Constraints

- Standard library only (`unicodedata`).
- The new test file builds every invisible character with `chr()`, so it carries none itself.
- The finding never makes the exit code non-zero.
- Every suite in `.github/workflows/v2-ci.yml` still passes.

## Premises

- `added_lines` already returns prose lines, so the check needs no new diff parsing — `grep -n "PROSE.search" specforge/scripts/review_prep.py` → holds: only inside `code_lines` (line 82), not in `added_lines`.
- U+202E, U+200B, U+FEFF and U+E0041 are category `Cf`, and U+200D is the ZWJ to exempt — `python3 -c "import unicodedata as u; print([u.category(chr(c)) for c in (0x202e,0x200b,0xfeff,0xe0041,0x200d,0x200c)])"` → holds: `['Cf', 'Cf', 'Cf', 'Cf', 'Cf', 'Cf']`.

## Acceptance evidence

`python3 scripts/invisible_chars_test.py` and every suite in `v2-ci.yml` pass:

1. An added code line holding a literal U+202E gives `should-fix` at that path and line, naming `U+202E`, and `review_prep.py` still exits 0.
2. The same character in an added `.md` line is reported too.
3. Literal U+200B, U+FEFF and U+E0041 are each reported with their code point.
4. A line holding U+200D (in 👩‍💻) and U+200C (in a Persian word) gives no finding. This fails against reporting all of category `Cf`.
5. The escaped text `"‮"` (backslash, u, digits) gives no finding.
6. A line holding U+2028 is reported.
7. The docstring of `review_prep.py` names the new should-fix.

## Stop and escalate

Stop and ask if an existing suite's fixture carries an invisible character that the new finding would flag. Budget: 9 iterations, 3 USD, for 8 tasks (7 scenarios and the full suite).
