# Lock checks move from instructions to scripts

**Mode**: Contract

```
MODE PROPOSAL
Risk: low — two v2 scripts gain a check each; no schema, no data, revertible; the new refusal goes in 1.0.0's headless blast radius
Uncertainty: low — both detections already exist (review_prep.py invisible_points, _added_entries); this extends them
Controlled flag: no — it touches nothing kubbo uses
Mode: Contract — two scripts, their test and a line in review.md: more than Direct's 2 files
```

Confirmed by the human, 2026-10-30. Decided in `specforge/DECISIONS.md` 2026-10-30, "Lock checks move from instructions to scripts", and queued before the v1 file swap.

## Outcome

A test that holds a literal invisible character cannot be locked. A locked test re-approved inside the reviewed range is reported even when the lock did not exist at the base.

## Scope

In:
- **`specforge/scripts/lock_tests.py` `approve`:** it reads each path first. If any holds a character that `review_prep.py`'s `invisible_points` reports, nothing is written. `approve` exits 1, and prints one line per file: `lock_tests: refused — <path>:<line> holds U+XXXX; write the escape`. U+200C and U+200D stay allowed, as in `review_prep.py`. A path that holds none is approved as today, with exit 0. The detector is imported from `review_prep.py`, not copied. The import sits inside `approve()`: `review_prep.py` already imports `lock_tests.py`, and a draft with a top-level import broke 38 suites on the circular import.
- **`specforge/scripts/review_prep.py` `_added_entries`:** an entry known to the lock's first version in the range whose hash at HEAD differs from that first version is reported as `should-fix: <lock>:<line> — approved entry changed after the first approval, confirm it: <entry>`. An entry that existed at the base keeps today's base-to-HEAD report and is not reported twice.
- `specforge/core/review.md` § Lock changes: one sentence for the new report.
- `scripts/lock_checks_test.py` (`new`), added to `v2-ci`.

Out:
- Changing what `invisible_points` counts.
- An unlock path or command.

## Context

- `specforge/scripts/lock_tests.py`: `approve` (line 81) and `main` (line 142).
- `specforge/scripts/review_prep.py`: `invisible_points` (line 124), `VALID_INVISIBLE`, `_added_entries` (line 188), `_locks_at`, `_parse_lock`.
- Fixtures: `scripts/review_test.py` `Repo` and `scripts/review_prep_lock_ci_test.py` `Base` (`approve`, `commit`, `review`).
- The lesson: `specforge/changes/archive/2026-10-29-update-retire-hardening/evidence.md` § Deviations.

## Constraints

- Every suite in `v2-ci.yml` keeps passing, unchanged, `review_prep_lock_ci_test` included.
- No new dependency. `lock_tests.py check` and `unlock` behave as today.

## Premises

- review_prep already detects invisible characters — `grep -c "def invisible_points" specforge/scripts/review_prep.py` → holds
- approve writes without reading the content for invisible characters — `grep -c "invisible" specforge/scripts/lock_tests.py` → holds

## Acceptance evidence

`python3 scripts/lock_checks_test.py` and every suite in `v2-ci.yml` pass:

1. `approve` on a test that holds U+202E exits 1. It names the file, the line and `U+202E`, and leaves the lock file absent, or byte-identical if it already existed. A test that holds only U+200D is approved with exit 0.
2. `approve` given a clean file and a file with U+FEFF writes nothing for either. Fails against approving file by file.
3. In a range where a lock is created, then one of its tests is edited and re-approved, `review_prep` reports `approved entry changed after the first approval, confirm it: <entry>`. A lock approved once in the range reports no such line.
4. A lock that already exists at the base, whose entry's hash changes in the range, gets today's report and not the new one, so the change is not reported twice.
5. `review.md` § Lock changes names `changed after the first approval`.

`v2-ci` and `cli-ci` pass on the last code commit.

## Stop and escalate

Stop and ask if `invisible_points` cannot be imported without side effects, or if a locked suite must change. Budget: 8 iterations, 3 USD, for 7 tasks (5 scenarios, the CI list, the full suites).
