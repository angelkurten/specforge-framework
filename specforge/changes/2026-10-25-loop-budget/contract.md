# The loop budget is the change's, not the run's

**Mode**: Contract

## Outcome

`loop.py` spends a change's budget once, across every run. It will not start a run that cannot finish: there must be at least one iteration left for each unticked task. A fix round gets more budget only by a human raising the `**Budget**:` line.

## Scope

In:
- **Refusal at start.** Before the first iteration, `loop.py` refuses with exit 2, and runs no agent, when the iterations left are fewer than the unticked tasks. Iterations left are the cap minus the iterations already spent. The message names the iterations left and the tasks left.
- **`loop-runs.txt` (new).** `<change>/loop-runs.txt` is a ledger written by `loop.py` only. After every iteration it appends one line, `iteration <n> usd <cost>`: `n` is the change's cumulative iteration count, and `cost` is that iteration's cost to 4 decimals. On start, `loop.py` reads the ledger. The spent iterations are its line count, and the spent cost is the sum of its `usd` values.
- **Caps are cumulative.**
  - The iteration cap and the cost cap both apply to what the change has spent, this run included.
  - A run that starts with the cost already at or over the cap stops with exit 3 before any agent runs.
  - `--max-iterations` and `--max-cost` keep overriding the `**Budget**:` values, and are cumulative too.
- **Iteration numbers.** The printed iteration line and `SPECFORGE_ITERATION` carry the cumulative number.
- **Docs.** `specforge/core/loop.md` and `loop.py`'s docstring say the budget is the change's, describe the refusal and name `loop-runs.txt`.

Out:
- Any change to the other stop conditions (exits 0, 2 no progress, 4, 5).
- Making `archive.py` or `review_prep.py` read the ledger.
- A CI-run check on the head, which is deferred (see `specforge/DECISIONS.md` after this change).

## Context

- `specforge/scripts/loop.py`:
  - `:64-74` `parse_budget`;
  - `:88-92` `cost_of`, which reads `total_cost_usd`;
  - `:100-171` `run`, with the stop order at `:158-171`;
  - `:176-185` `main`, the cap resolution.
- `specforge/core/loop.md:48`: the budget sentence.
- Pilot evidence:
  - `../specforge-pilot/specforge/changes/archive/2026-10-25-team-tasks/evidence.md`: the budget was below the task count, so the loop stopped one task short;
  - `../specforge-pilot/specforge/changes/archive/2026-10-25-team-task-statuses/evidence.md`: four runs after `BLOCKED` used 16 iterations against a budget of 14, because the count is per run.
- `scripts/archive_test.py:43-79`: the `Repo` fixture, one change with one locked test and `**Budget**: 5 iterations`.

## Constraints

- No new dependency; standard library only.
- The ledger is append-only and written only by `loop.py`.
  - A missing file means nothing has been spent.
  - A line that is not `iteration <int> usd <float>` stops the loop with exit 4, naming the line, the same as a malformed lock line.
- Every existing suite in `.github/workflows/v2-ci.yml` still passes. A test that relies on per-run counting is not edited: if one exists, stop and ask.

## Premises

- `cost_of` already reads the per-iteration cost the agent reports, so the ledger can sum it — `grep -n "total_cost_usd" specforge/scripts/loop.py` → holds: line 90.
- Archiving moves a change folder whole, untracked files included, so `loop-runs.txt` travels with it (`archive.py:64-67` uses `git mv`, else `shutil.move`) — `git init -q && mkdir a && echo x > a/t && git add a && git commit -qm x && echo y > a/u && mkdir arch && git mv a arch/a && ls arch/a` → holds: `t` and `u`, the untracked file moved too.
- No existing suite asserts that a second run starts its iteration count at 1 — `grep -rn "SPECFORGE_ITERATION\|iteration 1 —" scripts/*_test.py` → holds: no match.

## Acceptance evidence

`python3 scripts/loop_budget_test.py` and every suite in `v2-ci.yml` pass:

1. With `**Budget**: 1 iterations` and two unticked tasks, `loop.py` exits 2, runs no agent, and its message names `1` iteration left and `2` tasks left.
2. With `**Budget**: 2 iterations` and two unticked tasks, it starts. This fails against a refusal that counts ticked tasks too.
3. After a run of one iteration whose agent reports `total_cost_usd` 0.25, `loop-runs.txt` holds exactly `iteration 1 usd 0.2500`.
4. A second run on the same change continues the count. With one line already in the ledger, its first iteration prints `iteration 2` and passes `SPECFORGE_ITERATION=2` to the agent, and the ledger gains `iteration 2 usd …`.
5. With `**Budget**: 2 iterations`, one unticked task and two lines already in the ledger, the run refuses at start with exit 2 and runs no agent. This fails against per-run counting.
6. With `**Budget**: 5 iterations, 1 USD` and ledger lines summing to 0.90 USD, an agent reporting 0.20 makes the run stop with exit 3 after one iteration, naming `1.10`. With the ledger already at 1.00 USD, the run stops with exit 3 before any agent runs.
7. `--max-iterations 3` overrides `**Budget**: 1 iterations` with one ledger line and one unticked task, and the run starts.
8. A malformed ledger line stops the run with exit 4, quoting the line, and runs no agent.
9. `archive.py` moves `loop-runs.txt` with the change folder.
10. `specforge/core/loop.md` and `loop.py`'s docstring both name `loop-runs.txt` and say the budget is cumulative.

## Stop and escalate

Stop and ask if an existing suite depends on per-run counting, or if the ledger needs any writer other than `loop.py`. Budget: 12 iterations, 5 USD, for 11 tasks (10 scenarios and the full suite).
