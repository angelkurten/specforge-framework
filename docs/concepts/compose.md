# Compose

Source of truth: `specforge/core/compose.md`. The `specforge-compose` skill runs it.

A change is not closed until what it taught is in the harness. Compose turns each lesson into the cheapest artifact that would catch it next time.

## When

After review and before `archive.py`. The inputs are the change's own record: the evidence report's not-checked items and deviations, any `BLOCKED:` line, and every finding the reviewer raised.

## The ladder

Take the lowest rung that would have caught the lesson without a human noticing:

| Rung | Artifact |
|---|---|
| 1 test | A test or automatic check that fails if the error comes back. |
| 2 rule | A linter, structural test, hook or CI job. |
| 3 example | A canonical example the agent can imitate. |
| 4 instruction | One concise line in `CLAUDE.md` or a skill. |
| 5 doc | Documentation, only when nothing above can help. |

Climbing above rung 1 takes one line saying why the lower rungs cannot catch it.

## Record

`compose.md` in the change folder holds one table: lesson, rung, artifact, why not lower. `compose_check.py` refuses the record when a rung is invalid, an artifact does not exist, a climb has no reason, or a rung-1 artifact is not a test. `archive.py` refuses a change whose record the script refuses.
