# Compose

| Lesson | Rung | Artifact | Why not lower |
|---|---|---|---|
| A team's stats count only its tasks, give a non-member the same 404, and come as a list | 1 test | `../specforge-pilot/tests/test_team_stats.py` | — |
| An order travelled in a JSON object's keys and was lost in the JS client; each sibling passed its own tests and the defect sat at the boundary | 1 test | `../teamtasks-web/tests/stats.test.mjs` | — |
| The same, as a rule for the next change across siblings | 5 doc | `specforge/core/review.md` | That a response promises an order is a contract decision; no generic test sees it |
| The loop leaves untested Scope items unwritten (three times) | 4 instruction | `.claude/skills/specforge-loop/SKILL.md` | Which items cannot be tested is the contract writer's call |
| v2 stops maintaining SYSTEM_ARTIFACT.md | 5 doc | `specforge/DECISIONS.md` | A process decision; there is nothing to test |
