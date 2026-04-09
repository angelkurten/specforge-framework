# specforge

specforge is a framework for writing rigorous specifications (PRDs and ADRs) with AI as the primary author. It is stack-agnostic and domain-agnostic: any team — backend, frontend, infra, data, mobile, embedded — can adopt it. This file is loaded automatically by AI coding tools (Claude Code and similar) whenever a user works inside a specforge-managed directory. Read it before doing anything.

## What specforge gives you

- A workflow that forces the AI to **ground every claim in real code** before drafting.
- A **multi-reviewer critique loop** anchored to ground truth, not opinion.
- A **hard gate** between `Draft` and `Implemented` status so specs cannot lie about reality.
- A **single source of truth** (`SYSTEM_ARTIFACT.md`) for current system state, kept in sync by that same gate.
- Templates, conventions and reviewer briefings that are checkable, not vibes.

## Mental model

specforge distinguishes three kinds of documents. Do not confuse them.

| Document | Purpose | Lifecycle |
|---|---|---|
| **PRD** | A long ADR with implementation detail. Specifies *what* to build and *how* for one feature or change. | Historical snapshot. Frozen at `Implemented`. |
| **ADR** | A focused architectural decision with alternatives and trade-offs. | Historical snapshot. Frozen at `Accepted`. |
| **SYSTEM_ARTIFACT.md** | Current state of the system, organized by domain (auth, billing, ingest…). The one place to learn "what exists today". | Living document. Updated whenever a PRD ships. |

**Critical: PRDs are not living docs.** A PRD marked `Implemented` means "this is the design we shipped at commit X on date Y". It does *not* track subsequent changes. If you want to know what the system does *now*, read `SYSTEM_ARTIFACT.md` or the code. If you want to know *why* something was built the way it was, read the PRD that introduced it.

## Workflow

Follow these steps in order. Never skip investigation. Never draft before grounding.

### 1. Scope the request

If the request is vague ("let me rethink auth"), ask clarifying questions in prose. If the request has a small set of bounded alternatives the AI can enumerate with confidence (e.g. "store refresh tokens in cookie vs header vs body"), use structured `AskUserQuestion` — one question per call, 2–4 mutually exclusive options. Never batch multiple questions in a single tool call. If the user asks to answer in prose or to explain first, comply immediately without insisting on the structured format.

### 2. Ground in reality

Launch parallel `Explore` agents (or equivalent) to read, in this order:

1. `SYSTEM_ARTIFACT.md` for the impacted domain(s).
2. Related existing PRDs and ADRs (search by keyword, read `Depends on` chains).
3. The actual code for every component the change touches.

Do not proceed to drafting until each reviewer can point to concrete files, functions, tables, or endpoints that already exist. **Never invent** an endpoint, table, model, or function name. If something is new, mark it explicitly as new.

### 3. Plan the document

Before writing, decide:

- Is this a PRD, an ADR, or just a `SYSTEM_ARTIFACT.md` update? See the decision section below.
- Which projects / modules are impacted? This becomes the mandatory `Impacted Projects` table.
- Is this a single shippable unit, or should it be decomposed into phase PRDs (`NNN-phase-1-…`, `NNN-phase-2-…`) that each declare `Depends on` their predecessors? Split if the feature cannot be safely shipped in one commit or requires more than ~1500 lines of spec.

### 4. Draft

Write the PRD/ADR using the templates under `templates/`. Every required section (see `CONVENTIONS.md`) must be present — no placeholders, no "TBD" in shipped drafts. Use **Mermaid only** for diagrams. ASCII art diagrams are forbidden. Tables and nested bullet lists are not diagrams and remain allowed.

### 5. Multi-reviewer critique

Launch reviewers **in parallel**, each briefed with links to the real code paths they must verify against. A typical review panel has 4 reviewers — adapt to the domain:

- A domain/architecture reviewer (backend, frontend, infra, data…).
- A security reviewer.
- A quality/testing reviewer.
- A second domain reviewer for the secondary impacted area.

Every finding must carry a severity: 🔴 blocker, 🟡 should-fix, 🟢 nit. Reviewers must cite the file:line they reviewed against. Findings without ground-truth anchors are rejected.

### 6. Apply fixes

Consolidate findings. For ambiguous trade-offs, ask the user (prose or `AskUserQuestion` per step 1). Apply edits to the PRD.

### 7. Scoped re-review

Re-run **only** the reviewers whose dominion had 🔴 blockers. Do not run a fresh review from scratch. Re-review validates that the specific fixes landed correctly.

### 8. Ship as `Draft`

Merge the PRD at `Status: Draft`. It is now a design contract but not yet implemented.

### 9. Implement, then gate to `Implemented`

After code lands, the PRD can only be moved to `Status: Implemented` when all three gate items are satisfied. See next section.

## The `Implemented` gate

A PRD cannot transition from `Draft` to `Implemented` without all three of the following recorded in the **gate block** at the bottom of the PRD (a YAML fence under a `## Gate: Promotion to Implemented` heading — see `templates/prd.md` and `CONVENTIONS.md` § "Gate block"):

| Field | Meaning |
|---|---|
| `commit_hash:` | The commit (or merge commit) where the feature landed on the main branch. |
| `tests:` | YAML list of paths to tests that cover the PRD's acceptance criteria. At least one entry, one per line. |
| `system_artifact_diff:` | Link to the commit or section of `SYSTEM_ARTIFACT.md` where the new capability was reflected in the system state. |

For the canonical YAML shape of the gate block, see `CONVENTIONS.md` § "Gate block" or the bottom of `templates/prd.md`.

If any of the three is missing, the PRD stays `Draft`. No exceptions. The gate is what keeps `SYSTEM_ARTIFACT.md` honest: you cannot ship a feature without updating the source of truth.

## Hard rules

These are not preferences. Violating them fails review.

1. **Never invent** endpoints, tables, columns, functions, classes, env vars, or config keys. Verify each against real code, or mark it explicitly as **new** in the PRD.
2. **Never skip** the `Security`, `Test Plan`, or `Migration Plan` sections of a PRD.
3. **Diagrams are Mermaid only.** No ASCII art. Tables and nested bullets are not diagrams.
4. **No `> **Updated by PRD-X**` back-references.** The authoritative pointer lives in the *newer* PRD's `Depends on` / `Supersedes` header. To find newer PRDs that affect an older one, grep the older PRD's number across files with a newer number (see `CONVENTIONS.md` § "Finding newer PRDs").
5. **One question at a time** in `AskUserQuestion`. Never batch questions inside a single tool call.
6. **`Implemented` requires the three-field gate.** Draft PRDs never carry `commit_hash`, `tests`, or `system_artifact_diff` fields populated.
7. **PRDs are frozen snapshots.** Do not edit a PRD marked `Implemented` except to correct factual errors or mark it `Superseded by PRD-N`. Design evolution happens in a new PRD.
8. **`SYSTEM_ARTIFACT.md` is updated on every ship.** It is the only living document.
9. **No marketing language.** Forbidden: "blazingly fast", "enterprise-grade", "best-in-class", "robust", "seamless". Use concrete, measurable claims.
10. **Required in every PRD**: the `Impacted Projects` table in the header, plus these numbered sections — Problem Statement, Goals, Non-Goals, User Flows *(if user-visible)*, API, Data Model, Architecture, Security, Test Plan, Migration Plan, Open Questions. See `CONVENTIONS.md` § 6.

## PRD vs ADR vs SYSTEM_ARTIFACT update

Use this table to decide which document to write.

| If the change is… | Write a… |
|---|---|
| A new feature or user-visible capability with API, data model, and migration surface. | **PRD** |
| A set of features too large to ship atomically. | **Multiple phase PRDs**, each `Depends on` the previous, each independently shippable. |
| A pure architectural decision (which library, which pattern, build vs buy) with trade-offs and discarded alternatives. | **ADR** |
| A refinement of an existing shipped feature that changes its observable behavior. | **New PRD** that declares `Supersedes: PRD-N` in its header. Do not edit PRD-N. |
| A bug fix or internal refactor that does not change observable behavior, API, or data model. | **No PRD.** Update `SYSTEM_ARTIFACT.md` only if system state changed. |
| A correction of a factual error in an existing PRD (typo, wrong path). | **Edit in place**, note the correction at the top. Do not bump status. |
| A discovery that a shipped PRD was never fully implemented. | **Move it back to `Draft`**, strip the gate fields, explain why at the top. |

## Bootstrapping a new project

First-time adopters start with no `SYSTEM_ARTIFACT.md`. Bootstrap it in a single pass:

1. Run parallel `Explore` agents over the existing codebase, one per domain the team already recognises (auth, billing, ingest, reporting…).
2. For each domain, record: what exists, where it lives (file paths), what external dependencies it has, and any known invariants.
3. Commit `SYSTEM_ARTIFACT.md` as the first checkpoint. From that point on, every PRD that ships updates it.

Do not try to retrofit PRDs for already-shipped features. Historical PRDs are not a goal of this framework — `SYSTEM_ARTIFACT.md` covers the "what exists now" question.

## Layout

```
specforge/
├── CLAUDE.md            # This file. Loaded by AI tools automatically.
├── CONVENTIONS.md       # Detailed reference: naming, headers, sections, diagrams.
├── README.md            # Human-facing intro and adoption guide.
├── templates/           # PRD template, ADR template, SYSTEM_ARTIFACT template.
├── examples/            # Worked examples of each document type.
└── agents/              # Reviewer briefings (backend, frontend, security, quality).
```

When in doubt about format, consult `CONVENTIONS.md`. When in doubt about how a reviewer should behave, consult `agents/`. When in doubt about what a good PRD looks like, consult `examples/`.
