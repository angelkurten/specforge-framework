# review_prep reports added lock entries and a stale CI commit

**Mode**: Contract

```
MODE PROPOSAL
Risk: low — two should-fix findings in review tooling; no schema, auth, public API or one-way effect
Uncertainty: low — both checks are written as scenarios over temp git repos; the edge forms (short and full SHA, fake hex, sibling ranges, archive moves) are listed
Controlled flag: no — one team, no named regime
Mode: Contract
```

Confirmed by the human, 2026-10-29.

## Outcome

Two slips that only reviewers caught now show up in the mechanical findings:

- **An entry added to a lock after its first approval.** In change `2026-10-27-team-stats`, the fix round's `page.test.mjs` was added to a lock and no script reported it.
- **An evidence CI field that names commits but not the range's last code commit.** This is what happens when code is pushed after the report is written. Changes `2026-10-26-sibling-repos` and `2026-10-29-release-0-29-0` came close.

## Scope

In:
- **`specforge/scripts/review_prep.py`:**
  - **(a)** For each lock at HEAD, take its first version in the range: the base's if the lock existed there, else the first commit in the range that holds it. Every entry at HEAD that this first version lacks is reported as should-fix: `approved entry added after the first approval, confirm it: <entry>`. Archive moves are paired by canonical path, as today.
  - **(b)** In each repository the packet covers, specforge and every `--repo`, take the last commit in its range that touches a file outside the change folder: in specforge, outside `<change>`; in a sibling, any file. When the evidence's CI field names at least one hex token of 7 to 40 characters that resolves to a commit of that repository, and none of them is a prefix of that last commit, report should-fix: `CI field names no run on the last code commit <short sha> of <repo>`.
- **`specforge/core/review.md` § Lock changes:** the sentence saying the script does not report added entries becomes one saying it does.

Out:
- Asking a CI provider whether a commit has runs (`specforge/DECISIONS.md`, loop-budget entry: no provider-neutral CI interface).
- Changing the severity of any existing finding.

## Context

- **`specforge/scripts/review_prep.py`:**
  - `lock_findings()` pairs locks at base and at HEAD by `_canonical()`. It reports removed or changed entries and history lines, never added ones.
  - `evidence_findings()` reads the CI field, with `NAMES_A_RUN`.
  - `review()` takes `pairs` of siblings.
- **Suites that run `review_prep.py`:**
  - `scripts/review_test.py`, `review_fp_test.py`, `invisible_chars_test.py`, `foreign_lock_test.py`, `reapprove*_test.py`, `evidence_ci*_test.py`, `sibling_repos*_test.py` and `multi_sibling_review_test.py`.
  - Their evidence fixtures write `run 1` or the hex `abc1234`, which resolves to no commit. `review_fp_test.py` asserts no should-fix in several scenarios.
- **The lessons behind this:** `specforge/core/review.md` § Lock changes, where reviewers list added entries by hand, and the review skill's step 4.

## Constraints

- **Every existing suite passes unchanged.** A first approval reports nothing new, and a fixture hex that resolves to no commit triggers nothing.
- **Edge forms:**
  - the CI field may name a 7-character, a 12-character or a full 40-character SHA, in any case;
  - a hex that resolves to no commit does not count as naming one;
  - the change folder's own commits, such as the evidence, are not code commits;
  - a sibling with no commit in its range is left to the existing empty-range blocker;
  - an archived lock paired with its unarchived self is one lock.

## Premises

- No suite asserts that an added lock entry is unreported — `grep -rln "entry added" scripts` → holds
- Every fixture's CI hex resolves to no commit — `grep -rhoE "[0-9a-f]{7,40}" scripts/evidence_ci_test.py scripts/evidence_ci_fix_test.py | sort -u` → holds
- review_prep already reads the CI field's text — `grep -c "NAMES_A_RUN.search(value)" specforge/scripts/review_prep.py` → holds

## Acceptance evidence

`python3 scripts/review_prep_lock_ci_test.py`, every suite in `v2-ci.yml` and `pnpm test` in `tools/cli` all pass:

1. A lock created in the range and given a second entry in a later commit reports that entry as added. Its first entry is not reported.
2. A lock that existed at base and gains an entry in the range reports it. A lock created and approved once in the range reports nothing.
3. An evidence CI field naming only an older code commit reports the last code commit's short SHA. Naming the last one, by 7 characters or in full, reports nothing.
4. A CI field naming no real commit (`run 1`, `abc1234`) reports nothing. Commits that touch only the change folder are not code commits.
5. With `--repo ../app`, a CI field naming an older `../app` commit reports `../app`'s last commit.

## Stop and escalate

Stop and ask if an existing locked suite must change. Budget: 8 iterations, 3 USD, for 6 tasks (5 scenarios and the full suite).
