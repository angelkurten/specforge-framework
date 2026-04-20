---
name: model-selection
description: Per-role model assignment when dispatching sub-agents for review, generation, and critique panels.
---

# Model selection

When the lead agent dispatches any of the 12 briefings in `agents/` via the `Agent` tool, it must pass the `model` parameter per the tables below. These choices reflect the cognitive demands of each role: adversarial or high-blast-radius roles get `opus`, multi-source synthesis gets `sonnet`, mechanical extraction gets `haiku`.

## PRD reviewer panel (`workflow.md` steps 5 and 9)

| Briefing | Model |
|---|---|
| `backend-reviewer.md` | `opus` |
| `security-reviewer.md` | `opus` |
| `frontend-reviewer.md` | `sonnet` |
| `quality-reviewer.md` | `sonnet` |

## Roadmap generator panel (`roadmap.md` generative flow, PRD-001 §4.1)

| Briefing | Model |
|---|---|
| `roadmap-market-generator.md` | `sonnet` |
| `roadmap-ux-generator.md` | `sonnet` |
| `roadmap-product-generator.md` | `haiku` |
| `roadmap-support-generator.md` | `haiku` |

## Roadmap critic panel (`roadmap.md` generative flow, PRD-001 §4.1)

| Briefing | Model |
|---|---|
| `roadmap-evidence-critic.md` | `opus` |
| `roadmap-risk-critic.md` | `opus` |
| `roadmap-devils-advocate-critic.md` | `sonnet` |
| `roadmap-opportunity-cost-critic.md` | `sonnet` |

## Rationale

- **`opus`** for roles where a missed finding has lasting blast radius (security vulnerability, PII leak in public repo, risk or compliance gap) or where the reasoning is adversarial or cross-cutting architectural.
- **`sonnet`** for standard multi-source synthesis, well-structured review, or moderate creativity (connecting friction patterns to evidence).
- **`haiku`** for mechanical extraction from source data (tickets, metrics) where pattern-matching dominates over judgment.

## User override

The mapping is a default, not a hard rule. A user may override per dispatch — e.g. escalating a stubborn reviewer to `opus` for a particularly complex PRD, or downgrading to `haiku` for a trivial one. Overrides are per-call; the defaults stand for subsequent dispatches.

## Scope

This rule prescribes `model` only. The `effort` frontmatter field is not prescribed: empirical testing in this workspace did not show it to be respected by the current Claude Code version (16 parallel runs across sonnet and opus, high vs low vs absent, deltas within noise). Do not rely on `effort` until release notes confirm support.

## Implementers

The implementation team dispatched at `workflow.md` step 9 is not covered here. Those sub-agents are selected ad-hoc per sibling stack (e.g. `python-expert`, `backend-architect`) rather than from `agents/`, and the model choice depends on scope — a config bump is not an opus task, but a migration with foreign-key changes probably is. The lead agent uses judgment.
