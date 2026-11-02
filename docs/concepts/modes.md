# Modes

Source of truth: `specforge/core/modes.md`. The `specforge-classify` skill applies it.

Every change is classified on two axes before work starts:

- **Risk** decides how much verification the change needs. It is high when the change touches a schema, authentication, secrets, payments or personal data, a public contract, something hard to revert, or a flow every user passes through.
- **Uncertainty** decides whether to explore first. It is high when the outcome cannot yet be written as observable scenarios, when nobody knows which approach works, or when the change depends on behaviour nobody has observed.

A third field, the **Controlled flag**, is yes when the change is regulated or crosses teams, and no otherwise.

## Picking the mode

Take the first row that matches:

| Order | Mode | When |
|---|---|---|
| 1 | `Explore` | High uncertainty, at any risk. A throwaway prototype, then a contract. |
| 2 | `Controlled` | High risk and the flag is yes. Adds design mode review before red. |
| 3 | `Direct` | Low risk and trivial: at most two files besides its edge test. |
| 4 | `Contract` | Everything else. |

## The proposal

A refactor with no stated scope is `unsure` until it has a scope in one sentence; a `Direct` change has no behaviour beyond what one sentence states.

The agent proposes, a human confirms. The proposal names the signal behind each axis, so a correction can say which signal was wrong:

```
MODE PROPOSAL
Risk: high — changes a public contract (GET /orders drops `total`)
Uncertainty: low — outcome written as 3 scenarios
Controlled flag: no — one team, no named regime
Mode: Contract
```

A field the agent cannot decide is reported as `unsure`, and the mode is then resolved to the safer side. Next: [Contract](contract.md).
