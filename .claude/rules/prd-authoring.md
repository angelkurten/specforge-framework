---
name: specforge PRD authoring rules
description: Required sections, naming, and document-type decisions for PRDs. Always loaded because drafting happens in new files before any path pattern can match.
---

# PRD authoring

## Required sections

Every PRD must contain these, in this order. Omitting any fails review.

| # | Section | Purpose |
|---|---|---|
| — | **Impacted Projects** (header table) | Two columns: `Project` (must match a row name in `SIBLINGS.md`) and `Impact` (concrete technical summary). Primary project bolded. |
| 1 | **Problem Statement** | What user or system problem this solves. One to three paragraphs. Cite evidence. |
| 2 | **Goals** | Concrete, measurable outcomes. Imperative verbs. Typically 3-7 items. |
| 3 | **Non-Goals** | Things deliberately out of scope. Defends against scope creep. |
| 4 | **User Flows** *(if user-visible)* | Step-by-step scenarios. Mermaid sequence diagram for non-trivial flows. |
| 5 | **API** | Endpoints, schemas, status codes, error responses, rate limits. |
| 6 | **Data Model** | Tables, columns, constraints, indexes, migrations. Mermaid ERD for new or changed entities. |
| 7 | **Architecture** | How components interact. Mermaid diagram when the flow spans more than two components. For single-component changes, one sentence is enough — do not omit the section. |
| 8 | **Security** | Threats, mitigations, auth, secrets, PII. **Never skip.** |
| 9 | **Test Plan** | Table: `#` \| `Test` \| `Type` \| `Description` \| `Path`. The `Path` column names the concrete test file (relative to specforge dir, typically `../<sibling>/...`); it feeds the gate block's `tests` YAML list at promotion time. Cover happy path, edge cases, error branches, and regressions. **Never skip.** |
| 10 | **Migration Plan** | Rollout order, rollback procedure, data backfill, feature flags, deploy sequence. **Never skip.** |
| 11 | **Open Questions** | Checkbox list. Must be empty or explicitly deferred before `Implemented`. |

Optional sections (include when relevant): `Design Decisions`, `Performance`, `Observability`, `Accessibility`, `Frontend Spec`, `Rollout Plan`, `Cost Estimate`.

## Decision: PRD vs ADR vs SYSTEM_ARTIFACT update

| If the change is… | Write a… |
|---|---|
| A new feature or user-visible capability with API, data model, migration surface. | **PRD** |
| A set of features too large to ship atomically. | **Multiple phase PRDs**, each `Depends on` the previous, each independently shippable. |
| A pure architectural decision (library, pattern, build vs buy) with trade-offs and discarded alternatives. | **ADR** |
| A refinement of a shipped feature that changes observable behavior. | **New PRD** with `Supersedes: PRD-N` in its header. Do not edit PRD-N. |
| A bug fix or internal refactor without observable behavior change. | **No PRD.** Update the relevant sibling's `SYSTEM_ARTIFACT.md` only if system state changed. |
| A factual correction (typo, wrong path) to an existing PRD. | **Edit in place**, note the correction at the top. Do not bump status. |
| A discovery that a shipped PRD was never fully implemented. | **Move it back to `Draft`**, strip the gate fields, explain why at the top. |

## Naming

| Document | Pattern | Location |
|---|---|---|
| PRD | `NNN-kebab-case-title.md` | specforge root |
| ADR | `ADR-NNN-kebab-case-title.md` | specforge root |
| Phase PRD | `NNN-phase-M-kebab-case-title.md` | specforge root |

`NNN` is a 3-digit zero-padded monotonic sequence number. PRDs and ADRs have independent numbering sequences (PRD-001 and ADR-001 coexist).

Before assigning a new number, check the existing files with `ls` to avoid collisions.
