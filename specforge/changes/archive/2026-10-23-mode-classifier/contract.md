# Mode classifier

**Mode**: Contract

## Outcome

Before any work starts, the agent classifies a change on risk and uncertainty, proposes one of the four modes with its reasons, and the human confirms or corrects it. A confirmed Contract or Controlled change gets its folder and contract scaffolded from the template.

## Scope

In: the classification criteria as tool-agnostic text (`core/modes.md`), a Claude Code skill that runs them (`.claude/skills/specforge-classify/`), and a case table to check them against.
Out: the execution loop, the Explore parallel-variants flow, and any CLI command. v1's decision table in `prd-authoring.md` stays untouched until v1 rules are removed.

## Context

- `templates/contract.md` — what a confirmed change is scaffolded from.
- `DECISIONS.md` — "Mode is proposed by the agent and confirmed by a human".
- The v2 brief, "Los dos ejes": risk decides how much verification, uncertainty decides whether to explore first; Controlled sits on top of high risk when the change is regulated or crosses teams.

## Constraints

- Each axis is decided by named signals, not by feel, so two agents classifying the same request agree.
- An axis the agent cannot decide is reported as `unsure`, never silently resolved.
- With no human to confirm, every `unsure` axis resolves to high and the proposal is recorded as unconfirmed.
- The core text names no tool; the skill only points at it.

## Acceptance evidence

- `tests/v2/classify_cases.md` lists at least 8 requests covering all four modes plus an `unsure` case, each with its expected mode.
- A clean-context agent given only `core/modes.md` reproduces the expected mode on every case. Manual: needs an agent in the loop.
- `node tools/cli/dist/src/cli.js doctor` still reports 0 findings.

## Stop and escalate

Stop if a case cannot be classified without a signal the core text does not name: add the signal or ask. Budget: 3 iterations.
