# compose_check accepts a sibling's artifacts; archive refuses a refused compose

**Mode**: Contract

```
MODE PROPOSAL
Risk: low — adds an accepted path form and a refusal to archive; no schema, auth, public API or one-way effect
Uncertainty: low — two scenarios each, over temp repos like the existing compose/archive tests
Controlled flag: no — one team, no named regime
Mode: Contract
```

Confirmed by the human, 2026-10-27.

## Outcome

A change run from the specforge sibling can name a code sibling's test or file as a compose artifact, and `compose_check.py` accepts it. `archive.py` refuses a change whose `compose.md` exists but `compose_check.py` rejects. `team-detail` was archived with a refused `compose.md` (`370a714`): its rung-1 artifact `../specforge-pilot/tests/test_team_detail.py` is "outside the repository", and nothing stopped the archive.

## Scope

In:
- **`specforge/scripts/compose_check.py`:**
  - an artifact is accepted when it resolves inside the repository, as today, or inside a sibling repository, meaning a directory beside the repository root that holds a `.git`;
  - every other path outside the repository is still refused;
  - the docstring is updated to match.
- **`specforge/scripts/archive.py`:** when `<change>/compose.md` exists, every `compose_check` problem is a refusal. A change with no `compose.md` archives as today, which the archive suites' fixtures rely on.
- **`specforge/core/compose.md`:** one line on sibling artifacts and on the archive refusal.
- **Proof:** after the change, `python3 specforge/scripts/compose_check.py specforge/changes/archive/2026-10-26-team-detail` exits 0. This is recorded in the evidence, not as a test.

Out:
- Requiring `compose.md` for every archive.
- Changing what counts as a test file.

## Context

- `specforge/scripts/compose_check.py:55-61`: `path = (root / artifact).resolve()`, then refused unless `root.resolve() in path.parents`.
- `specforge/scripts/archive.py`: `refusals()` collects evidence findings, lock drift and changed locked tests.
- Suites that run these scripts:
  - `scripts/compose_test.py` runs `compose_check.py`. Its test for an out-of-repository path must stay refused.
  - `scripts/archive_test.py`, `reapprove_test.py`, `reapprove_fix_test.py`, `reapprove_fix2_test.py`, `symlinked_lock_fix_test.py` and `evidence_ci_test.py` archive fixtures that have no `compose.md`.
- `specforge/core/loop.md` § Sibling repositories, and the archived `2026-10-26-sibling-repos`, whose Explore did not cover `compose_check.py`.

## Constraints

- **Edge forms of the artifact path:**
  - a sibling file through `../<sibling>/`, or through an absolute path, is accepted;
  - `../<dir>` without `.git`, a `..` escape past the parent, and a symlink resolving outside both the repository and its siblings are refused;
  - a missing file is still "does not exist".
- `compose.md` refusals print as `archive: refused — compose: <problem>`.
- Every suite in `v2-ci.yml` and `pnpm test` in `tools/cli` pass.

## Premises

- No archive suite's fixture writes a compose.md — `grep -ln "compose.md" scripts/archive_test.py scripts/reapprove_test.py scripts/reapprove_fix_test.py scripts/reapprove_fix2_test.py scripts/symlinked_lock_fix_test.py scripts/evidence_ci_test.py` → holds
- compose_check refuses the team-detail record today — `python3 specforge/scripts/compose_check.py specforge/changes/archive/2026-10-26-team-detail` → holds
- The specforge parent holds the code sibling as a git repository — `git -C ../specforge-pilot rev-parse --is-inside-work-tree` → holds

## Acceptance evidence

`python3 scripts/compose_siblings_test.py`, every suite in `v2-ci.yml` and `pnpm test` in `tools/cli` all pass:

1. A rung-1 artifact `../app/tests/app_test.py` in a sibling git repository is accepted, given relative or absolute.
2. `../plain/notes.md`, where `../plain` has no `.git`, is refused as outside the repository. So are `../../x.md` and a symlink inside the repository that resolves outside it and its siblings.
3. A missing sibling file is refused as "does not exist".
4. `archive.py` refuses a change whose `compose.md` names a missing artifact, prints `archive: refused — compose:`, and leaves the folder in place.
5. `archive.py` still archives a change with a valid `compose.md`, and a change with none.

## Stop and escalate

Stop and ask if an existing locked suite must change. Budget: 8 iterations, 3 USD, for 6 tasks (5 scenarios and the full suite).
