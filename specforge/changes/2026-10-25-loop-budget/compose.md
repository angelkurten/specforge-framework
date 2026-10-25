# Compose

| Lesson | Rung | Artifact | Why not lower |
|---|---|---|---|
| A budget below the task count let the loop start and stop one task short (pilot change 2026-10-25-team-tasks) | 1 test | `scripts/loop_budget_test.py` | — |
| Reruns after BLOCKED counted iterations per run and overshot the change's budget (pilot change 2026-10-25-team-task-statuses) | 1 test | `scripts/loop_budget_test.py` | — |
| An iteration could truncate, delete or forge the ledger and get fresh budget | 1 test | `scripts/loop_budget_fix_test.py` | — |
| An altered ledger stayed altered, so a rerun got its budget back | 1 test | `scripts/loop_budget_fix2_test.py` | — |
| A symlinked or directory ledger reset the budget or crashed, and the ledger check hid a changed locked test | 1 test | `scripts/loop_budget_fix3_test.py` | — |
| The task order in progress.md ignored which routes each test calls | 4 instruction | `.claude/skills/specforge-loop/SKILL.md` | No script knows which routes a test calls |
| A premise about existing tests checked status codes and missed the bodies they assert | 4 instruction | `.claude/skills/specforge-loop/SKILL.md` | Which assertions count as the premise is a judgement |
| The evidence named CI runs on commits that were unpushed, or pushed under a newer tip | 4 instruction | `.claude/skills/specforge-review/SKILL.md` | The right rung is review_prep.py querying the CI provider; v2 has no provider-neutral CI interface yet, so it waits for a decision |
| No guard inside loop.py stops a hostile agent with python3; four review rounds kept finding new tampering cases | 5 doc | `specforge/core/loop.md` | A test can pin a known case, not the class; the threat ceiling and the known gaps are a statement of scope |
