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

### § 2 Goals — optional phrasing for reactive goals

For a goal that describes how the system reacts to a trigger or an undesired condition, prefer an event/condition-first phrasing over an open-ended "Support X". This is the testable core of EARS notation, applied only where it removes ambiguity:

- Event-driven: *"When `<trigger>`, the system shall `<response>`."*
- Unwanted: *"If `<condition>`, then the system shall `<response>`."*

Example — instead of *"Rate-limit login attempts"*, write *"If login attempts exceed 10/min per IP, then the system shall return 429 before any database lookup."* The second maps directly to a § 9 Test Plan row.

This is a **style suggestion, not a requirement**, and applies only to reactive goals. Do not restructure § 5 API, § 6 Data Model, or § 9 Test Plan into this form — those sections are already more precise (schemas, column tables, concrete test paths). Do not add a separate "Acceptance Criteria" section; it would duplicate § 9.

## Decision: PRD vs ADR vs SYSTEM_ARTIFACT update

| If the change is… | Write a… |
|---|---|
| A new feature or user-visible capability with API, data model, migration surface. | **PRD** |
| A set of features too large to ship atomically. | **Multiple phase PRDs**, each `Depends on` the previous, each independently shippable. |
| A pure architectural decision (library, pattern, build vs buy) with trade-offs and discarded alternatives. | **ADR** |
| A refinement of a shipped feature that changes observable behavior. | **New PRD** with `Supersedes: PRD-N` in its header. Do not edit PRD-N. |
| A bug fix or internal refactor without observable behavior change. | **No PRD.** Update the relevant sibling's `SYSTEM_ARTIFACT.md` only if system state changed. |
| A small change *with* observable behavior but below the PRD size floor (~300 lines of spec; see `CONVENTIONS.md` § 1) — tuning a constant, a copy edit, a single config flag. (If the change is purely internal with *no* observable effect, use the bug-fix/refactor row above instead — the two rows partition on the observable-behavior axis.) | **No PRD.** Update the impacted sibling's `SYSTEM_ARTIFACT.md` if system state changed, and capture the rationale in the commit message. Escalate to a PRD only if a reviewer flags risk or the change grows past the floor. |
| A high-blast-radius implementation decision a sub-agent makes autonomously during `workflow.md` step 9 (schema shape, migration strategy, dependency choice) that the PRD did **not** specify. | Optionally record an **AgDR** (Agent Decision Record) — see `## Optional artifact: Agent Decision Records` below. |
| A factual correction (typo, wrong path) to an existing PRD. | **Edit in place**, note the correction at the top. Do not bump status. |
| A discovery that a shipped PRD was never fully implemented. | **Move it back to `Draft`**, strip the gate fields, explain why at the top. |

## Optional artifact: Agent Decision Records

When a sub-agent on the implementation team (`workflow.md` step 9) makes a **high-blast-radius design decision the PRD did not specify** — the shape of a new table, a migration strategy, a dependency choice, a non-obvious algorithm — that decision deserves the same traceability specforge gives human decisions in ADRs. Record it as an **Agent Decision Record (AgDR)** using `templates/agdr.md`.

AgDRs are **opt-in and rare by design.** Most implementations emit zero. The bar is deliberately high to avoid the over-documentation failure mode (one AgDR per trivial choice). Apply it only when *all* of:

- the decision was made autonomously by the agent, not dictated by the PRD;
- reversing it later would be costly (schema, data, public contract, dependency);
- a future maintainer would ask "why was it done this way?" and the PRD would not answer.

An AgDR is referenced by number in a comment above the gate block, the same way a follow-up PRD is (`gate-block.md`). It does not gate promotion — it is a record, not a precondition. AgDRs are frozen snapshots like ADRs (hard rule 7 applies); the living state stays in `SYSTEM_ARTIFACT.md`.

## Naming

| Document | Pattern | Location |
|---|---|---|
| PRD | `NNN-kebab-case-title.md` | specforge root |
| ADR | `ADR-NNN-kebab-case-title.md` | specforge root |
| Phase PRD | `NNN-phase-M-kebab-case-title.md` | specforge root |
| AgDR | `AgDR-NNN-kebab-case-title.md` | specforge root |

AgDRs have their own independent numbering sequence (`AgDR-001` coexists with `PRD-001` and `ADR-001`).

`NNN` is a 3-digit zero-padded monotonic sequence number. PRDs and ADRs have independent numbering sequences (PRD-001 and ADR-001 coexist).

Before assigning a new number, check the existing files with `ls` to avoid collisions.

## Optional header field: `Roadmap item`

PRDs may carry an optional header field linking back to `ROADMAP.md`:

```markdown
**Roadmap item**: ROADMAP-NNN
```

- **When present**, `ROADMAP-NNN` must resolve to an item in `ROADMAP.md` with `status != Parked`. A reference to a `Parked` item fails PRD validation.
- **When absent**, the gate-promotion auto-update flow (PRD-001 §4.2) creates a retroactive item in `ROADMAP.md` with `status: Shipped` and `evidence: [PRD-NNN]` in the same commit as the gate block.
- **PRDs authored before PRD-001 is implemented are grandfathered** — the field is optional, not retroactively required. The retroactive escape covers them on their next ship.
