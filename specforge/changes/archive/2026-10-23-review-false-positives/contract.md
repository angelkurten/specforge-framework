# Fewer false positives in review_prep.py

**Mode**: Contract

## Outcome

`review_prep.py` stops blocking legitimate changes. It no longer reports patterns written as data (prose, string literals, docstrings), and it reports a likely test rename as should-fix rather than blocker. Every true positive the locked tests pin keeps reporting.

## Scope

In: three heuristics in `scripts/review_prep.py`, and their tests in a new `scripts/review_fp_test.py`.
Out: the empty-range warning, and any change to `scripts/review_test.py`, which is locked.

## Context

- `changes/2026-10-23-adversarial-reviewer/evidence.md`, Not checked: 15 false positives when the script runs on its own change.
- `scripts/review_test.py`: locked; all 8 of its tests must still pass. Scenario 5 there requires `throw new Error('not implemented')` to report, so that stub is matched on the raw line even though it sits inside a string.

## Constraints

- Python 3 standard library and `git` only.
- A heuristic only removes findings. It never adds a blocker.

## Acceptance evidence

`python3 scripts/review_fp_test.py` and `python3 scripts/review_test.py` pass:

1. A skip marker or stub added to a `.md`, `.txt`, `.rst` or `.adoc` file reports nothing.
2. A skip marker or `TODO` inside a single- or double-quoted string, or a raw string, on a code line reports nothing.
3. A skip marker or stub on a line inside a triple-quoted string added in the same diff reports nothing.
4. A real `@pytest.mark.skip` decorator and a `# TODO` comment on the same change still report.
5. A test removed from a file that adds a different test in the same diff reports a should-fix naming both, not a blocker.
6. A test removed from a file that adds no test still reports a blocker.

Manual: run `review_prep.py` on the adversarial reviewer's own change (base `4378e5d`, head `cd7e21d`). None of the 15 false positives remain.

## Stop and escalate

Stop if a heuristic makes any locked test in `scripts/review_test.py` fail. Budget: 3 iterations.
