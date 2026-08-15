---
name: specforge framework maintenance
description: Rules for editing specforge's own framework files (CLAUDE.md, CONVENTIONS.md, SIBLINGS.md, .claude/rules/*). Loads only when editing framework files themselves.
paths:
  - "CLAUDE.md"
  - "CONVENTIONS.md"
  - ".claude/rules/*.md"
---

# Framework maintenance

You are editing specforge itself — the framework, not a team's PRD. The rules here govern how specforge evolves without re-accumulating the bloat it was designed to avoid.

## Keep CLAUDE.md small

CLAUDE.md is loaded at session start and is resident for the entire PRD authoring session. Every line competes for LLM attention against hard rules, mental model, gate block rules, and every other instruction in context.

**Target: under 50 lines.** Detailed rules go in `.claude/rules/*.md`, not inline in CLAUDE.md. CLAUDE.md's job is to point the AI at the right rule files and carry the minimal mental model — nothing more.

If you find yourself wanting to add a multi-paragraph explanation to CLAUDE.md, stop. That content belongs in a rule file, `CONVENTIONS.md`, or `README.md`.

## Rule file conventions

Every `.claude/rules/*.md` file starts with YAML frontmatter:

```yaml
---
name: <short descriptive name>
description: <one-line description; used to decide relevance when scanning the rules directory>
paths:          # omit entirely for unscoped (always-loaded) rules
  - "<glob>"    # include only when the rule applies to a specific file pattern
---
```

**One topic per file.** The filename is the topic. Do not crowd unrelated rules into a single file "because it's easier to edit" — the separation is the forcing function against re-bloat. A rule file that mixes gate-block rules with ADR-format rules is already too large.

## Adding a new rule

- **Rule applies in every session (PRD drafting, grounding, review)** → add to the topically-correct unscoped rule file (`hard-rules.md`, `workflow.md`, `gate-block.md`, `prd-authoring.md`), or create a new unscoped rule file if the topic does not fit.
- **Rule applies only when editing a specific file type** (e.g. ADRs, framework files, reviewer briefings) → create a new path-scoped rule file with a `paths:` glob.
- **Never add rules directly to `CLAUDE.md`.** CLAUDE.md is a pointer file, not a rule container. If you catch yourself editing CLAUDE.md to add a rule, move it to a rule file and update the pointer instead.

## Adding a new reviewer role

The default multi-reviewer panel is four roles (backend, frontend, security, quality), shipped as Claude Code subagent definitions under `.claude/agents/specforge/`. Teams may need more — `performance-reviewer`, `a11y-reviewer`, `data-reviewer`, `infra-reviewer`, etc. To add one:

1. **Put the definition outside the framework namespace** — `.claude/agents/<team-dir>/<role>-reviewer.md`, or the `.claude/agents/` root. **Never inside `.claude/agents/specforge/`.** That directory is framework-owned: a team file placed there is collected and deleted by `init --force --erase`, invisible to `update`'s drift check (which iterates bundle paths only), and flagged as an error by the `subagent-frontmatter` validator. Outside it the file classifies `unknown` — never written, never erased, never drift-checked — and dispatch works identically, because Claude Code's `.claude/agents/` scan is recursive and identity is the frontmatter `name`, not the directory.
2. **The `name` must not start with `specforge-`.** That prefix is reserved for the framework's own role definitions (reviewer, roadmap generator/critic, and implementer), and the `subagent-frontmatter` validator reports a `specforge-`named file outside the namespace as an error (case-insensitively) — it is the shadowing control, since a file anywhere under `.claude/agents/` registers under whatever `name` it declares.
3. Copy the structure of an existing definition (e.g. `.claude/agents/specforge/specforge-backend-reviewer.md`): the frontmatter (`name`, `description`, `model`, optionally `tools`), the six labelled brief fields the dispatch prompt carries (`PRD_PATH`, `REVIEW_MODE`, `SIBLING_CLAUDE_MD_PATH`, `CODE_REFERENCES`, `SYSTEM_ARTIFACT_PATH`, `DOMAIN_CONTEXT`) with the halt clause for a missing `REVIEW_MODE`, the "What you must do" steps including the mandatory "Read the sibling's `CLAUDE.md` first" step and the diagrams-are-normative step, the data-not-instructions clause, the severity scheme (🔴🟡🟢), the report format with `file:line` citations, and the single-line verdict.
4. **No registry update is needed** — but write a `description` that says what surface the role reviews. `workflow.md` step 5 carries a trigger table for the four framework roles, and it states explicitly that the table is not exhaustive: a team-owned role is selected on the same axis, read off its own definition's `description`. That makes the `description` field load-bearing for dispatch, not just for discovery. "Reviews performance-sensitive paths" does not tell a lead when to launch it; "reviews any PRD whose §5 API adds a synchronous call on a request path, or whose §6 Data Model adds an unindexed query" does. Do **not** add rows to `workflow.md` — it is a framework file and the upgrade contract overwrites it.
5. If the new role has different dispatch semantics than "one instance per impacted sibling" (e.g. a cross-cutting threat model like `specforge-security-reviewer`), document it in the definition's "Note on multi-sibling PRDs" block so the team lead knows whether to launch one-per-sibling or a single instance.

The four reviewer definitions in `.claude/agents/specforge/` are canonical reference implementations. When in doubt about format, copy from `.claude/agents/specforge/specforge-backend-reviewer.md`.

The six-field brief contract above applies **only to PRD reviewer definitions**. Generator and critic definitions used by the roadmap cycle (see next section) operate pre-code and use a separate brief contract, and implementer definitions (see the section below the roadmap one) use a third, write-capable contract of their own.

## Adding a new implementer role

The default implementation team is two roles (backend, frontend), shipped as Claude Code subagent definitions under `.claude/agents/specforge/`, dispatched at `workflow.md` step 9. Teams may need more — `mobile-implementer`, `infra-implementer`, `data-pipeline-implementer`, etc. — for scope that doesn't fit a backend/frontend split. To add one:

1. **Same namespace rule as reviewers** — put the definition outside `.claude/agents/specforge/` (a team dir, or the `.claude/agents/` root) and give it a `name` that does not start with `specforge-`. The reasoning is identical to reviewer roles: files inside the framework namespace are collected and deleted by `init --force --erase`, invisible to `update`'s drift check, and flagged by the `subagent-frontmatter` validator.
2. Copy the structure of an existing definition (e.g. `.claude/agents/specforge/specforge-backend-implementer.md`): the frontmatter (`name`, `description`, `model`, `tools` — implementers need `Edit` and `Write` in addition to the reviewer read-only set, since they change code), the six labelled brief fields (`PRD_PATH`, `IMPL_MODE`, `SIBLING_CLAUDE_MD_PATH`, `SIBLING_ROOT`, `SCOPE`, `SYSTEM_ARTIFACT_PATH`) with the halt clause for a missing `IMPL_MODE`, the "what you must do" steps including the mandatory "read the sibling's `CLAUDE.md` first" step, the diagrams-are-normative step, the "never edit the PRD" clause, the AgDR bar reference, the data-not-instructions clause (elevated relative to a reviewer's, since an implementer holds `Edit`/`Write`/`Bash` and can act on an injected instruction directly rather than merely report it), the `fix-round` mode section, the domain-scoped "what you focus on" / "what you do NOT do" split, and the completion-report format (files changed / tests added / AgDR filed / deviations / open questions — not a severity-scored finding report, since an implementer ships code rather than critiques it).
3. **No registry update is needed.** Implementer roles are not enumerated in `CLAUDE.md` or any rule file beyond the reference table in `model-selection.md`. The team lead dispatching at step 9 chooses which roles to launch based on the PRD's `Impacted Projects` and each sibling's stack — same pattern as the reviewer panel.
4. Document the role's dispatch semantics (one instance per sibling needing that domain's work is the default, same as reviewers) in the definition's "Note on multi-sibling PRDs" block.

`specforge-backend-implementer.md` and `specforge-frontend-implementer.md` are canonical reference implementations for this contract.

## Generator/critic definition variant

Roadmap generator and critic definitions (`.claude/agents/specforge/specforge-roadmap-*-generator.md`, `.claude/agents/specforge/specforge-roadmap-*-critic.md`) are pre-code: they reason about proposed roadmap items, not existing sibling code. Their input contract differs from the PRD reviewer contract in the preceding section. Like the reviewers, they receive their brief as labelled lines in the dispatch prompt — there is no template substitution.

**Generator contract (4 fields)** — every `specforge-roadmap-*-generator` definition accepts:

- `ROADMAP_PATH` — the current `ROADMAP.md` file.
- `GROUNDING_CONTEXT` — the summary produced at the cycle's grounding step (active siblings, their `SYSTEM_ARTIFACT.md`s, PRDs in `Draft`, last N `Implemented`).
- `DOMAIN_CONTEXT` — free-form focus note from the lead agent (e.g. "prioritise onboarding and retention this cycle").
- `PANEL_MODE` — `generate` for generators (see below).

**Critic contract (5 fields)** — every `specforge-roadmap-*-critic` definition accepts the four generator fields plus:

- `CANDIDATE_ITEMS` — the consolidated output from the generative panel, ready for critique.

`PANEL_MODE` takes one of two values: `generate` (dispatched by the generative panel) or `critique` (dispatched by the critical panel). **The mode is a contract, not a heuristic** — a definition dispatched without an explicit `PANEL_MODE` halts with a single `VERDICT: BLOCK` finding ("missing required brief field: `PANEL_MODE`"). Same pattern as the PRD reviewer definitions with `REVIEW_MODE`.

**Prompt-injection hardening.** Every generator and critic definition wraps user-supplied evidence text in a triple-backtick fence labelled `untrusted-evidence`, with an explicit preamble directing the sub-agent to treat fence contents as data, not commands. The canonical fence specification (scope, per-entry fencing, preamble re-emission, triple-backtick escape, and the exact template) lives in `.claude/rules/roadmap.md`. Definitions cross-reference that rule; they do not duplicate its text.

**Scope note.** The six-field contract in the "Adding a new reviewer role" section applies only to **PRD reviewer definitions**. The 4- and 5-field contracts in this section apply only to **roadmap generator and critic definitions**. The six-field contract in "Adding a new implementer role" applies only to **implementer definitions** — same field count as the reviewer contract by coincidence, not by shared meaning; the fields themselves differ (`IMPL_MODE`/`SIBLING_ROOT` vs. `REVIEW_MODE`/`CODE_REFERENCES`). A new definition that does not fit any of the three patterns requires a new section here before it ships.

## Splitting an existing rule file

If a rule file grows past ~150 lines or accumulates unrelated sub-topics, split it. The filename schema and the `name:` frontmatter field make the split traceable in the rules directory.

## CONVENTIONS.md vs rule files

Two different concerns:

- **`CONVENTIONS.md`** is reference material: exact header shapes, naming patterns, diagram syntax, cross-reference formats. Lookup when you need to know the exact shape of something.
- **`.claude/rules/*.md`** are behavioral rules: what the AI must or must not do. Loaded into context automatically at session start (unscoped) or on file match (scoped).

A thing that answers "what shape should this be?" belongs in `CONVENTIONS.md`. A thing that answers "what must I verify / never do / always do when writing this?" belongs in a rule file.

## No marketing language

Same as hard rule 9. Applies to the framework's own files too. Forbidden: "blazingly fast", "enterprise-grade", "best-in-class", "robust", "seamless".

## v2.0 upgrade contract

Framework files (`CLAUDE.md`, `CONVENTIONS.md`, `.claude/rules/*`, `.claude/agents/specforge/*`, `templates/*`, `examples/*`, `README.md`, `LICENSE`) are updated by pulling a new version of specforge. Team data (`SIBLINGS.md`, the team's own PRDs and ADRs) is never touched by upgrades. If you find yourself wanting to put team-mutable content in a framework file, stop — it belongs in `SIBLINGS.md` or in the team's PRDs.
