# specforge

A framework for changing software with AI as the primary author, under a written contract and tests a human approved. Stack-agnostic and domain-agnostic.

This file loads at session start and stays short. For humans adopting specforge, start with [`README.md`](README.md).

## The cycle

Every change picks one of four modes, then runs the steps that mode needs:

| Mode | When |
|---|---|
| `Direct` | Small, reversible, obvious. No contract. |
| `Contract` | A defined outcome with tests. Contract, red tests, loop, review. |
| `Explore` | The outcome is unknown. Learn first, then reclassify. |
| `Controlled` | High risk. The full cycle plus design review and a human at each gate. |

The steps, in order: classify, contract, red, loop, review, compose.

- **classify** proposes a mode and scaffolds the change folder once a human confirms.
- **contract** states outcome, scope, constraints and acceptance evidence.
- **red** writes failing tests from the contract; a human approves and locks them.
- **loop** implements in clean-context iterations until the locked tests pass.
- **review** is an adversarial reviewer with a clean context.
- **compose** turns each lesson into the cheapest artifact that catches it.

## Where things live

- `specforge/core/` — the method: modes, the cycle, the rules each step follows.
- `.claude/skills/` — one skill per step; they run the method.
- `specforge/scripts/` — the mechanical checks and the loop runner.
- `specforge/changes/` — one folder per change: contract, progress, evidence.
- `.claude/rules/specforge.md` — the invariants that hold in every session.

## Sibling projects

specforge is a sibling directory to the code repositories it governs (`../<sibling>`), never vendored inside one. A sub-agent working in a sibling is briefed explicitly with that sibling's own `CLAUDE.md`; specforge does not auto-load it.

## History

The first version of the framework (PRDs, ADRs and their rules) is kept readable under `history/v1/` in specforge's source repository, not in an adopter's tree. It is not loaded and not shipped.
