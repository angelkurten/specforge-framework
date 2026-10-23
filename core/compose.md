# Compose

A change is not closed until what it taught is in the harness. Composing turns each lesson into the cheapest artifact that would catch it next time, so the system gets better with every change instead of accumulating instructions.

## When

After review and before `scripts/archive.py`. The inputs are the change's own record:
- the evidence report's Not checked items, deviations and review tables;
- any `BLOCKED:` line and loop stop reason;
- every finding the reviewer raised.

## The ladder

Take the lowest rung that would have caught the lesson without a human noticing it:

| Rung | Artifact |
|---|---|
| 1 test | a test or automatic check that fails if the error comes back |
| 2 rule | an executable architecture rule: a custom linter, a structural test, a hook, a CI job |
| 3 example | a canonical example in the repository the agent can imitate |
| 4 instruction | one concise line in `AGENTS.md`, `CLAUDE.md` or a skill |
| 5 doc | further documentation, only when nothing above can help |

Climbing above rung 1 takes one line saying why the lower rungs cannot catch it. Every entry answers: *would the system catch this on its own next time?*

## Record

`<change>/compose.md` holds one table:

```
| Lesson | Rung | Artifact | Why not lower |
```

`python3 scripts/compose_check.py <change>` refuses the record if:
- a rung is not one of the five;
- an artifact does not exist;
- a climb carries no reason;
- a rung-1 artifact is not a test;
- a rung-4 `AGENTS.md` or `CLAUDE.md` is over 80 lines. Past the cap, an instruction becomes a skill or an executable rule.

The script checks that the record is complete and points at something real. Whether the rung is right is decided by the human who confirms it.
