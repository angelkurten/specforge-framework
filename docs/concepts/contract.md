# Contract

Source of truth: `templates/contract.md`. Each change copies it into `specforge/changes/<YYYY-MM-DD>-<slug>/contract.md`. Direct changes write none; Explore writes one after the prototype.

A contract states the minimum intent the agent needs so it does not guess. It fits on one screen.

| Section | Holds |
|---|---|
| Outcome | What the user can do afterwards that they could not before. |
| Scope | What is in, and what is explicitly out. |
| Context | Existing files and decisions that matter, as paths. |
| Constraints | Compatibility, security, performance, patterns to respect. |
| Premises | Beliefs whose failure would make the change wrong. |
| `## Retired tests` | Optional. Tests the change deletes on purpose, each with a reason. |
| Acceptance evidence | Observable scenarios plus the commands that must pass. |
| Stop and escalate | When the agent stops and asks, and the loop budget. |

## Premises

Each premise is one bullet with the cheapest command that checks it and what it returned:

```
- mkdocs builds offline — `uv run --offline mkdocs --version` → holds
```

The loop does not start while a premise has no result or a failed one. A failed premise sends the change back to classify.

## Acceptance evidence

Each scenario becomes a failing test before any code is written. A scenario that cannot fail without the change is not evidence.

## Retired tests

A change that retires a feature declares each test it deletes, one bullet per path with the reason after an em dash. The reviewer reports each as should-fix and the human confirms it. Next: [Loop](loop.md).
