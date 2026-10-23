# Adversarial reviewer cases

**Execution**: manual — needs an agent in the loop. Build the repository below on a branch off `main`, run `python3 specforge/scripts/review_prep.py specforge/changes/demo --base main`, then give the `specforge-reviewer` agent the packet with a clean context.

## Case 1 — seeded defects a pattern cannot see

Base commit: `src/cart.py` holds `total(xs)` raising `NotImplementedError`. The contract `specforge/changes/demo/contract.md` is in Contract mode. Its Scope is "`total` and its tests; out: any other cart feature", and its Acceptance evidence is: (1) `total([])` is 0, (2) `total([1.5, 2.5])` is 4.0, (3) a negative price raises `ValueError`.

Change commit, on a branch:

| Seeded defect | Where |
|---|---|
| Scope creep: a new `export_csv` function | `src/cart.py` |
| Trivial test: `test_sum` asserts `total is not None` | `tests/test_cart.py` |
| Scenario 3 neither implemented nor tested | `src/cart.py`, `tests/test_cart.py` |
| Evidence claims "all three acceptance scenarios pass" with 2 tests | `specforge/changes/demo/evidence.md` |

Expected:
- `review_prep.py` exits 0 with no findings, because none of the four is a pattern.
- The reviewer returns `VERDICT: BLOCK`, with a blocker anchored at each of the four.
