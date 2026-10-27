# review_prep.py takes several code siblings

**Mode**: Contract

```
MODE PROPOSAL
Risk: low — review tooling only; repeating flags that today accept one value; no schema, auth, public API or one-way effect
Uncertainty: low — the one-sibling path is built and tested; this generalizes it to a list
Controlled flag: no — one team, no named regime
Mode: Contract
```

Confirmed by the human, 2026-10-27.

## Outcome

A change that touches two code siblings, a backend and a frontend, gets one review packet covering both diffs. `--repo` and `--repo-base` may repeat. The first `--repo` pairs with the first `--repo-base`, and so on. Each sibling's range goes through every code check that one sibling gets today. This makes the sandbox the human asked for possible: specforge with a backend sibling and a frontend sibling, and one change across both.

## Scope

In:
- `specforge/scripts/review_prep.py`:
  - `--repo` and `--repo-base` become repeatable and are paired in order;
  - every pair is normalized and checked as one pair is today;
  - `review()` and `packet()` take the list of pairs;
  - the `Range` line and the reviewer paragraph name every sibling's range and its `git -C … diff`;
  - an empty range in any sibling is a blocker naming that sibling.
- `specforge/core/loop.md` § Sibling repositories, and `.claude/skills/specforge-review/SKILL.md`: one line each saying the flags repeat, with one `--add-dir` per sibling for the loop agent.

Out:
- A per-sibling lock or change folder. One change keeps one lock.

## Context

- `specforge/scripts/review_prep.py`:
  - `main()` holds one `--repo`/`--repo-base` pair, normalized through `rev-parse --show-toplevel` and checked with `rev-parse --verify`;
  - `review()` builds `sibling`, `code_added` and `sources` for one repository;
  - `foreign_lock_findings()` compares resolved paths.
- Suites that run `review_prep.py` with one pair: `scripts/sibling_repos_test.py` and `scripts/sibling_repos_fix_test.py`, `_fix2_test.py` and `_fix3_test.py`. Test 5 expects exit 2 and a stderr that names `--repo` and `--repo-base`, never "unrecognized arguments".
- Other suites that run it without the flags: `scripts/review_test.py`, `review_fp_test.py`, `invisible_chars_test.py`, `foreign_lock_test.py` and `reapprove*_test.py`.
- The lead can run `claude -p --add-dir` with two directories; the flag takes several.

## Constraints

- With one pair, or none, every existing suite passes unchanged.
- **Edge forms:**
  - an unequal number of `--repo` and `--repo-base` is a usage error (exit 2);
  - two `--repo` that resolve to the same toplevel are a usage error naming both;
  - a symlink or subdirectory in any pair normalizes as it does for one;
  - a bad ref in any pair exits 2 naming that ref and that sibling.

## Premises

- One pair is handled today and its suites pass — `python3 scripts/sibling_repos_test.py` → holds
- Only the sibling suites pass `--repo` — `grep -rln -e "--repo" scripts` → holds
- `claude -p` takes several directories after `--add-dir` — `claude --help` → holds

## Acceptance evidence

`python3 scripts/multi_sibling_review_test.py`, every suite in `v2-ci.yml` and `pnpm test` in `tools/cli` all pass:

1. With `../app` and `../web` paired in order, the packet lists both siblings' changed files under their own prefixes. The `Range` line names both ranges, and the reviewer paragraph names `git -C ../app diff …` and `git -C ../web diff …`.
2. A skip marker added in the second sibling's test is a blocker at `../web/<file>:<line>`. An empty range in the second sibling alone is a blocker naming `../web`.
3. Two `--repo` with one `--repo-base`, or the reverse, exits 2 with a usage error naming the flags.
4. `--repo ../app` given twice, once relative and once absolute, exits 2 naming the duplicate.
5. A bad ref in the second pair exits 2 naming that ref and `../web`. A second `--repo` given through a symlink reports as `../web`.

## Stop and escalate

Stop and ask if a locked suite must change. Budget: 8 iterations, 3 USD, for 6 tasks (5 scenarios and the full suite).
