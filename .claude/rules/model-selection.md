---
name: model-selection
description: Per-role model assignment when dispatching sub-agents for review, generation, and critique panels.
---

# Model selection

When the lead agent dispatches any of the 12 briefings in `agents/` via the `Agent` tool, it must pass the `model` parameter per the tables below. These choices reflect the cognitive demands of each role: adversarial or high-blast-radius roles get `opus`, everything else gets `sonnet`.

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
| `roadmap-product-generator.md` | `sonnet` |
| `roadmap-support-generator.md` | `sonnet` |

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
- **`haiku`** has no default role. The two generator roles it once held read `ROADMAP.md` in full plus `{{GROUNDING_CONTEXT}}`, and Haiku's 200k context is a ceiling that work can exceed — a structural limit, not a quality judgement. Haiku also supports neither adaptive thinking nor `effort`, so it cannot participate in any future effort tuning. It stays available as a user override for a trivially-scoped dispatch.
- **`fable`** has no default role either. Its advantage grows with task length and horizon; every briefing here is a bounded single-pass review returning one report, which is where the premium buys least. It is also the wrong escalation for `security-reviewer.md` specifically: Claude Code routes offensive-security workloads off Fable to an Opus model, "often on the first request", so a security panel dispatched to `fable` may not run on the model you asked for.

## User override

The mapping is a default, not a hard rule. A user may override per dispatch — e.g. escalating a stubborn reviewer for a particularly complex PRD, or downgrading for a trivial one. Overrides are per-call; the defaults stand for subsequent dispatches.

The `Agent` tool's `model` parameter accepts the aliases `opus`, `sonnet`, `haiku`, and `fable`. Aliases resolve to the newest version of their family, so these assignments track model releases without edits to this file.

## Scope

This rule prescribes `model` only.

**`effort` is real, but not reachable from the dispatch path specforge uses.** Claude Code supports `effort` (`low | medium | high | xhigh | max`) in skill and subagent *frontmatter*, where it overrides the session level. It is not a parameter on the `Agent` tool, and the briefings in `agents/` are plain prompt templates with no frontmatter — so every briefing dispatched here inherits the **session** effort level. Adding `effort:` to a file in `agents/` would be inert; do not.

What a user can do today: set the level for the whole authoring session with `/effort <level>` or `--effort <level>` at launch. Raising it before a step-9 post-implementation re-review is the useful case, since that is where reviewers walk a diff reading both source and test files. Precedence is `CLAUDE_CODE_EFFORT_LEVEL` > frontmatter > session level > model default; the default is `high` on every model that supports effort.

Making effort settable per role would mean converting `agents/*.md` into subagent definitions under `.claude/agents/`. That is a framework-maintenance decision with its own trade-offs — the `{{VARIABLE}}` substitution contract would have to move from the briefing body to the dispatch prompt — and is out of scope for this rule.

Model facts above were verified against `code.claude.com/docs` and `platform.claude.com/docs` on 2026-07-27. Re-check before citing them as current.

## Implementers

The implementation team dispatched at `workflow.md` step 9 is not covered here. Those sub-agents are selected ad-hoc per sibling stack (e.g. `python-expert`, `backend-architect`) rather than from `agents/`, and the model choice depends on scope — a config bump is not an opus task, but a migration with foreign-key changes probably is. The lead agent uses judgment.
