# A contract can retire tests on purpose

**Mode**: Contract

```
MODE PROPOSAL
Risk: low — review_prep stops treating the deletions a contract declares, with a reason, as blockers; it reports them as should-fix for the human to confirm. Deleting a locked test still gets the lock check's report, and an undeclared deletion is still a blocker
Uncertainty: low — the deletion check is one site (specforge/scripts/review_prep.py:355-372); the format follows the contract's Premises bullets
Controlled flag: no — it touches nothing kubbo uses
Mode: Contract — review_prep.py, the contract template, review.md and a test
```

Confirmed by the human, 2026-11-01. It runs before change 3a, the v1 package swap, which deletes the CLI tests that pin v1.

## Outcome

A change that retires a feature can delete the tests that pin it, without the script blocking the review. Each deletion is declared in the contract with its reason, and the human confirms it the way they confirm a lock change.

## Scope

In:
- **`templates/contract.md`:** an optional `## Retired tests` section, with a comment naming the bullet form: `- <path> — <why>` for a whole file, `- <path>::<test name> — <why>` for one test. `<path>` is written as the packet prints it, `../<sibling>/…` for a sibling.
- **`specforge/scripts/review_prep.py`:** it reads the contract's `## Retired tests` bullets.
  - A deleted test file whose path is declared prints `should-fix: <path>:1 — test file retired by the contract, confirm it: <why>` instead of the blocker.
  - A removed test function whose `<path>::<name>` is declared, or whose whole file is declared, prints `should-fix: <path>:<line> — test <name> retired by the contract, confirm it: <why>` instead of the blocker.
  - A bullet with no ` — <why>`, or an empty reason, retires nothing.
  - A declared entry that the range does not delete prints `nit: <contract>:<line> — retired test not deleted in the range: <entry>`.
- **`specforge/core/review.md`:** § Two halves gets one sentence, and § Lock changes says the human confirms each retired test.
- `scripts/retired_tests_test.py` (`new`), added to `v2-ci`.

Out:
- Any change to the lock checks: deleting a locked test keeps its own report.
- Skip markers and stubs.

## Context

- `specforge/scripts/review_prep.py`:
  - `review()` (line 334);
  - the deletion checks (lines 355-372);
  - `TEST_FILE` (line 41);
  - `test_names`.
- `templates/contract.md`: § Premises shows the bullet form this mirrors.
- Fixtures:
  - `scripts/review_test.py` `Repo` (`change`, `review`);
  - `scripts/sibling_repos_test.py` `Siblings` (`app_change`, `review`).

## Constraints

- Every suite in `v2-ci.yml` keeps passing, unchanged.
- A retired test never lowers any other finding on the same file: a skip marker, a stub or a lock report.

## Premises

- A deleted test file is always a blocker today — `grep -c "test file deleted" specforge/scripts/review_prep.py` → holds
- No contract section retires tests yet — `grep -c "Retired tests" specforge/scripts/review_prep.py templates/contract.md` → holds

## Acceptance evidence

`python3 scripts/retired_tests_test.py` and every suite in `v2-ci.yml` pass:

1. A deleted test file declared with a reason is a should-fix `retired by the contract, confirm it: <why>`, not a blocker. The same deletion undeclared is a blocker.
2. A removed test function declared as `<path>::<name>` is a should-fix, and another removed function in the same file that is not declared stays a blocker. A whole-file entry covers every function removed from that file.
3. A bullet with no reason retires nothing. Fails against matching the path alone.
4. A declared entry that the range does not delete prints a `nit` naming it.
5. A sibling test declared as `../app/tests/app_test.py` is retired the same way.
6. `templates/contract.md` names `## Retired tests`, and `review.md` names `retired by the contract`.

Fix round, after review (PASS, three should-fix), in `scripts/retired_tests_fix_test.py` (`new`):

7. The contract is read from git at HEAD: an uncommitted bullet retires nothing.
8. An entry absent from the contract's first version in the range is also reported as `should-fix: <contract>:<line> — retired entry added after the contract's first version, confirm it: <entry>`. The first version is the base's, or else the first commit in the range that holds the contract.
9. A bullet inside an HTML comment retires nothing.
10. A whole-file entry reports a `retired by the contract` should-fix for each removed function.
11. The template comment names the exact bullet form: `- `, a bare path, a reason after an em dash.

Fix round 2, after re-verification (PASS, one should-fix), in `scripts/retired_tests_fix2_test.py` (`new`):

12. The contract is looked up at each revision under its live or its archived path (`changes/<name>/`, `changes/archive/<name>/`). So a late entry is still flagged when the change was archived inside the range.

`v2-ci` and `cli-ci` pass on the last code commit.

## Approvals

- Mode Contract and the red tests in `scripts/retired_tests_test.py`, approved and locked: the human, 2026-11-01.
- Fix round after review, with its test `scripts/retired_tests_fix_test.py` approved and locked: the human, 2026-11-01. A draft passed every suite first.
- Fix round 2 after re-verification, with its test `scripts/retired_tests_fix2_test.py` approved and locked: the human, 2026-11-01. It is the last round before escalation.

## Stop and escalate

Stop and ask if a locked suite must change, or if a sibling path cannot be matched as the packet prints it. Budget: 8 iterations, 3 USD, for 8 tasks (6 scenarios, the CI list, the full suites). Raised by the human to 11 iterations, 4 USD, cumulative, for the fix round, and to 13 iterations, 5 USD, for fix round 2.
