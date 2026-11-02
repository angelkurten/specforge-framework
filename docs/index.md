# specforge EVA

specforge EVA is a framework for changing software with AI as the primary author, under a written contract and tests a human approved. It is stack-agnostic and domain-agnostic.

The human decides the outcome and approves the tests. The agent writes the code, in clean-context iterations, until the approved tests pass. A second agent, with no memory of writing the code, then tries to break it.

## The four modes

Every change picks one mode, then runs the steps that mode needs. See [Modes](concepts/modes.md).

| Mode | When |
|---|---|
| `Direct` | Small, reversible, obvious. No contract. |
| `Contract` | A defined outcome with tests. Contract, red tests, loop, review. |
| `Explore` | The outcome is unknown. Learn first, then reclassify. |
| `Controlled` | High risk. The full cycle plus design review and a human at each gate. |

## The cycle

classify, contract, red, loop, review, compose.

1. **Classify** proposes a mode; a human confirms. See [Modes](concepts/modes.md).
2. **Contract** states outcome, scope, constraints and acceptance evidence. See [Contract](concepts/contract.md).
3. **Red** writes failing tests from the contract; a human approves and locks them.
4. **Loop** implements until the locked tests pass. See [Loop](concepts/loop.md).
5. **Review** is an adversarial reviewer with a clean context. See [Review](concepts/review.md).
6. **Compose** turns each lesson into the cheapest artifact that catches it. See [Compose](concepts/compose.md).

## Install

```
npx @angelkurten/specforge init
```

Then follow the [Quickstart](quickstart.md) for a first change. If the code lives in another repository, read [Sibling projects](concepts/siblings.md). Coming from the first version of the framework? Read the [migration guide](migration-v1-to-v2.md). Common questions are in the [FAQ](faq.md).
