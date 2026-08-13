---
name: model-selection
description: Per-role model assignment when dispatching sub-agents for review, generation, and critique panels.
---

# Model selection

The 14 role definitions — 12 panel roles plus 2 implementer roles — are
Claude Code subagent definitions under `.claude/agents/specforge/`. **Each
definition's `model:` frontmatter field is
the canonical per-role assignment** — the lead agent dispatches by name
(`subagent_type: specforge-<role>`) and the model resolves from the definition.
There is no per-dispatch step to remember and nothing for the lead to
re-derive from this file.

This rule explains *why* the assignments are what they are, and what a user
may do to override them.

## The assignments (non-normative summary)

Reproduced here for reading convenience only. **The frontmatter is the
source of truth**; if this table and a definition disagree, the definition
wins and this table is the bug.

| Role | `model` |
|---|---|
| `specforge-backend-reviewer` | `opus` |
| `specforge-security-reviewer` | `opus` |
| `specforge-frontend-reviewer` | `sonnet` |
| `specforge-quality-reviewer` | `sonnet` |
| `specforge-roadmap-market-generator` | `sonnet` |
| `specforge-roadmap-ux-generator` | `sonnet` |
| `specforge-roadmap-product-generator` | `sonnet` |
| `specforge-roadmap-support-generator` | `sonnet` |
| `specforge-roadmap-evidence-critic` | `opus` |
| `specforge-roadmap-risk-critic` | `opus` |
| `specforge-roadmap-devils-advocate-critic` | `sonnet` |
| `specforge-roadmap-opportunity-cost-critic` | `sonnet` |
| `specforge-backend-implementer` | `sonnet` |
| `specforge-frontend-implementer` | `sonnet` |

The reviewer panel runs at `workflow.md` steps 5, 7 and 9; the generator and
critic panels run in the `roadmap.md` generative flow (PRD-001 §4.1); the
implementer roles run at `workflow.md` step 9, dispatched once per sibling
per scope, initial pass and any fix rounds.

## Rationale

Adversarial or high-blast-radius roles get `opus`, everything else gets
`sonnet`.

- **`opus`** for roles where a missed finding has lasting blast radius (security vulnerability, PII leak in public repo, risk or compliance gap) or where the reasoning is adversarial or cross-cutting architectural.
- **`sonnet`** for standard multi-source synthesis, well-structured review, or moderate creativity (connecting friction patterns to evidence).
- The two implementer roles default to **`sonnet`** for the same reason as the review-panel `sonnet` roles: writing code against a frozen, already-reviewed PRD is bounded synthesis, not adversarial reasoning — the PRD did the hard design thinking and the reviewer panel already stress-tested it twice (draft and, after this pass, post-implementation). This is a default, not a ceiling: escalate a specific dispatch to `opus` via the per-call override below when the scope is a high-blast-radius migration (foreign-key changes, backfills, an irreversible schema shape) rather than routine CRUD or component work.

  **This assignment is argued on task difficulty, and the rule's stated axis is blast radius — the two do not agree here, deliberately.** The implementers are the only roles holding `Edit`+`Write`+`Bash`, so a missed *action* has larger blast radius than a missed *finding* anywhere else in the roster, and read literally the axis above would put them on `opus`. They stay on `sonnet` because the blast radius is bounded by controls the reviewer roles do not have: the work is specified by a frozen PRD rather than open-ended, the whole diff is re-read by the post-implementation panel before anything gates, and nothing an implementer writes reaches a sibling's main branch without the lead's commit. The escalation clause above covers the case where those controls are thinnest. A team that disagrees has a one-word override and no framework change to make.
- **`haiku`** has no default role. The two generator roles it once held read `ROADMAP.md` in full plus the `GROUNDING_CONTEXT` brief field, and Haiku's 200k context is a ceiling that work can exceed — a structural limit, not a quality judgement. Haiku also supports neither adaptive thinking nor `effort`, so it cannot participate in any future effort tuning. It stays available as a user override for a trivially-scoped dispatch.
- **`fable`** has no default role either. Its advantage grows with task length and horizon; every role here is a bounded single-pass review returning one report, which is where the premium buys least. It is also the wrong escalation for `specforge-security-reviewer` specifically: Claude Code routes offensive-security workloads off Fable to an Opus model, "often on the first request", so a security panel dispatched to `fable` may not run on the model you asked for.

## User override

The frontmatter values are defaults, not hard rules. A user may override per
dispatch — e.g. escalating a stubborn reviewer for a particularly complex
PRD, or downgrading for a trivial one — by passing the `Agent` tool's `model`
parameter on that call. **The per-dispatch parameter outranks frontmatter.**
Overrides are per-call; the frontmatter defaults stand for every subsequent
dispatch.

Resolution order, first match wins:

1. `CLAUDE_CODE_SUBAGENT_MODEL` environment variable
2. the per-dispatch `model` parameter on the `Agent` call
3. the definition's `model:` frontmatter
4. the session model

The `model` parameter and the frontmatter field both accept the aliases
`opus`, `sonnet`, `haiku`, and `fable`. Aliases resolve to the newest version
of their family, so these assignments track model releases without edits to
the definitions. A concrete model ID (e.g. `claude-opus-5`) in frontmatter is
rejected by the `subagent-frontmatter` validator — pinned IDs rot when models
retire, and the per-dispatch parameter already covers deliberate pinning.

## Scope: `effort`

This rule prescribes `model` only, but `effort` is now reachable per role and
the reason it used to be unreachable is gone.

Claude Code supports `effort` (`low | medium | high | xhigh | max`) in skill
and subagent *frontmatter*, where it overrides the session level. It is not a
parameter on the `Agent` tool. When the 12 roles were plain markdown briefing
templates with no frontmatter, there was no place to set it and adding an
`effort:` line would have been inert. As subagent definitions they have
frontmatter, so **`effort:` is settable per role today** by editing the
definition.

**The framework deliberately sets none.** All 14 definitions omit `effort:`
and inherit the session level (PRD-006 §3). Choosing framework-level defaults
is deferred until there is evidence that a specific role under- or overspends;
a team that has that evidence for its own repo may add the field locally, and
the `subagent-frontmatter` validator does not object.

What a user can do without editing anything: set the level for the whole
authoring session with `/effort <level>` or `--effort <level>` at launch.
Raising it before a step-9 post-implementation re-review is the useful case,
since that is where reviewers walk a diff reading both source and test files.
Precedence is `CLAUDE_CODE_EFFORT_LEVEL` > frontmatter > session level > model
default; the default is `high` on every model that supports effort.

Model facts above were verified against `code.claude.com/docs` and
`platform.claude.com/docs` on 2026-08-09. Re-check before citing them as
current.

## Implementers

The implementation team dispatched at `workflow.md` step 9 is covered by
two of the 14 definitions: `specforge-backend-implementer` and
`specforge-frontend-implementer`, dispatched by name exactly like the
reviewer panel — `subagent_type: specforge-backend-implementer`, etc. Both
default to `sonnet`; see the rationale note above for when to escalate a
specific dispatch to `opus`.

The two canonical roles split by domain (backend vs. frontend), the same
axis the reviewer panel already uses, and rely on `SIBLING_CLAUDE_MD_PATH`
for stack-specific conventions rather than one definition per language —
so a Python backend and a Go backend both dispatch to
`specforge-backend-implementer`.

**Scope that fits neither role** — mobile, infra/ops, a data pipeline, or
any sibling stack specialized enough to need its own persona — is not
forced into `specforge-backend-implementer` or `-frontend-implementer`.
The lead either adds a team-owned implementer definition following
`framework-maintenance.md` § Adding a new implementer role, or falls back
to an ad-hoc sub-agent (e.g. a stack-specific agent type available in the
session) chosen by judgment, the same escape hatch the framework has
always used for implementation work outside the two canonical roles.
