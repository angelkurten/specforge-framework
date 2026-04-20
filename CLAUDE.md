# specforge

Framework for writing rigorous PRDs and ADRs with AI as the primary author. Stack-agnostic, domain-agnostic.

This file is loaded automatically at session start. It is intentionally minimal — it orients the AI and points at the rule files, document conventions, and team registry where the real content lives. For humans adopting specforge, start with [`README.md`](README.md).

## Mental model

Three kinds of documents. Do not confuse them:

| Document | Purpose | Lifecycle |
|---|---|---|
| **PRD** | A long ADR with implementation detail. Specifies *what* to build and *how* for one feature or change. | Historical snapshot. Frozen at `Implemented`. |
| **ADR** | A focused architectural decision with alternatives and trade-offs. | Historical snapshot. Frozen at `Accepted`. |
| **`SYSTEM_ARTIFACT.md`** | Current state of one sibling project, organised by domain. One file per project that needs it; lives inside that sibling, not in specforge. | Living document. Updated whenever a PRD that impacts the project ships. |
| **`ROADMAP.md`** | Product-level plan: problems, users, evidence. One global file at specforge root. | Living document. Updated on generative cycles and PRD ships. |

**Load-bearing**: PRDs and ADRs are frozen. To learn what the system does *now*, read the relevant sibling project's `SYSTEM_ARTIFACT.md` or the code. To learn *why* something was built the way it was, read the PRD that introduced it.

## Sibling projects

specforge is a sibling directory to the code repositories it describes, not a subdirectory. The team registry of sibling projects — names, paths, stacks, status — lives in [`SIBLINGS.md`](SIBLINGS.md). Every PRD's `Impacted Projects` table must reference projects by name from that registry. Sub-agents dispatched to implement or review code in a sibling must be briefed explicitly with the sibling's `CLAUDE.md` path via Read tool instructions — specforge does not auto-load sibling rules.

## Rules live in `.claude/rules/`

Detailed behavioural rules are in `.claude/rules/`. They load automatically — unscoped rules every session, path-scoped rules only when editing matching files.

**Always-loaded (unscoped):**

- [`hard-rules.md`](.claude/rules/hard-rules.md) — the 12 invariants that govern every PRD and ADR
- [`workflow.md`](.claude/rules/workflow.md) — the 9-step authoring process
- [`gate-block.md`](.claude/rules/gate-block.md) — the `Draft` → `Implemented` gate schema
- [`prd-authoring.md`](.claude/rules/prd-authoring.md) — required sections, naming, document-type decisions
- [`roadmap.md`](.claude/rules/roadmap.md) — the roadmap cycle, evidence discipline, and fence spec
- [`model-selection.md`](.claude/rules/model-selection.md) — per-role model assignment for sub-agent dispatch

**Path-scoped:**

- [`adr-specific.md`](.claude/rules/adr-specific.md) — loads when editing `ADR-*.md`
- [`framework-maintenance.md`](.claude/rules/framework-maintenance.md) — loads when editing specforge's own framework files

## Other pointers

- [`CONVENTIONS.md`](CONVENTIONS.md) — format reference: header shapes, naming, diagram syntax, cross-references
- [`templates/`](templates/) — blank PRD, ADR, and SYSTEM_ARTIFACT templates
- [`examples/`](examples/) — worked examples of each document type
- [`agents/`](agents/) — briefing templates for the multi-reviewer critique step
- [`README.md`](README.md) — human-facing overview, adoption guide, file layout diagram, bootstrap procedure
