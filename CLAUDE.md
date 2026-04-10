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
| **SYSTEM_ARTIFACT.md** | Current state of one sibling project, organized by domain (auth, billing, ingest…). One file per project that needs it; lives inside that sibling, not in specforge. The one place to learn "what exists today" for that project. | Living document. Updated whenever a PRD that impacts the project ships. |

**Critical: PRDs are not living docs.** A PRD marked `Implemented` means "this is the design we shipped at commit X on date Y". It does *not* track subsequent changes. If you want to know what the system does *now*, read the relevant sibling project's `SYSTEM_ARTIFACT.md` (see § Sibling projects below) or the code. If you want to know *why* something was built the way it was, read the PRD that introduced it.

## Sibling projects

**specforge is a sibling directory to the code repositories it describes, not a subdirectory of them.** This directory and the PRDs around it contain no code — every reference to code points at a neighbouring project at a known relative path.

Team-specific project data lives in a dedicated registry file: **[`SIBLINGS.md`](SIBLINGS.md)** at the root of this directory. It is the single source of truth for which projects exist, where they live, what stacks they use, and which are active vs retired. Framework files (this `CLAUDE.md`, `CONVENTIONS.md`, templates, examples, agents) ship with specforge and are updated by pulling a new version; `SIBLINGS.md` is team data that never conflicts with framework upgrades.

**On day 1 of adoption, fill in `SIBLINGS.md` before writing any PRD.** See § Bootstrapping below.

Every PRD's `Impacted Projects` table references projects by name alone — those names must match active rows in `SIBLINGS.md` (see hard rule 11). Step 2 of the workflow (Ground in reality) launches parallel Explore agents against the paths declared in the registry and halts if any path does not resolve on the current machine.

## Workflow

Follow these steps in order. Never skip investigation. Never draft before grounding.

### 1. Scope the request

If the request is vague ("let me rethink auth"), ask clarifying questions in prose. If the request has a small set of bounded alternatives the AI can enumerate with confidence (e.g. "store refresh tokens in cookie vs header vs body"), use structured `AskUserQuestion` — one question per call, 2–4 mutually exclusive options. Never batch multiple questions in a single tool call. If the user asks to answer in prose or to explain first, comply immediately without insisting on the structured format.

### 2. Ground in reality

**Precondition:** before launching grounding agents, verify every registry path (column `Path` in `SIBLINGS.md`) resolves on the current machine for the siblings this change will impact. If any path does not resolve, **halt and ask the user** — never proceed with partial grounding. Silent degradation produces PRDs that cite code that does not exist.

Once paths are verified, launch parallel `Explore` agents (or equivalent) — **one agent per impacted sibling** (as listed in `SIBLINGS.md`). Each agent reads, in this order:

1. That sibling's `CLAUDE.md` (project-specific rules on top of specforge's).
2. That sibling's `SYSTEM_ARTIFACT.md`, if the registry declares one.
3. Related existing PRDs and ADRs in specforge (search by keyword, read `Depends on` chains).
4. The actual code inside that sibling for every component the change touches.

Do not proceed to drafting until the findings from every sibling agent point to concrete files, functions, tables, or endpoints that already exist in that sibling. **Never invent** an endpoint, table, model, or function name. If something is new, mark it explicitly as new.

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
8. **Each impacted sibling's `SYSTEM_ARTIFACT.md` is updated on every ship that touches that sibling.** `SYSTEM_ARTIFACT.md` files (one per sibling that maintains one) are the only living documents in this framework — PRDs and ADRs are frozen snapshots. The `system_artifact_diff` gate field is what enforces this: you cannot promote a PRD without updating the living state of every sibling it impacts.
9. **No marketing language.** Forbidden: "blazingly fast", "enterprise-grade", "best-in-class", "robust", "seamless". Use concrete, measurable claims.
10. **Required in every PRD**: the `Impacted Projects` table in the header, plus these numbered sections — Problem Statement, Goals, Non-Goals, User Flows *(if user-visible)*, API, Data Model, Architecture, Security, Test Plan, Migration Plan, Open Questions. See `CONVENTIONS.md` § 6.
11. **Sibling registry discipline.** Every row in a PRD's `Impacted Projects` table must match, by name, a row in `SIBLINGS.md`. `Draft` PRDs may only cite rows with `Status: active`; historical PRDs (`Implemented`, `Superseded`) may cite retired rows too (the registry is append-only — see `SIBLINGS.md` § Rules). Adding, renaming, or retiring a sibling in the registry happens in the same commit as the PRD that triggers it, never afterwards.

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

## Bootstrapping a new specforge directory

On day 1, a team adopting specforge has three setup tasks. Do them in order, before writing any PRD.

### 0. Decide where specforge lives in your repo topology

specforge expects to live as a sibling directory to the code repos it describes (see § Layout below). Pick one layout:

- **Monorepo**: add `specforge/` as a top-level directory alongside your existing code directories. `../api-service/` resolves within the monorepo.
- **Independent sibling repos**: clone specforge as its own repository under the same parent as your code repos (e.g. `~/work/specforge/`, `~/work/api-service/`). `../api-service/` resolves across repos.

If your team cannot guarantee the sibling layout on every machine that runs specforge tooling (dev laptops, CI runners, staging boxes), use absolute paths in `SIBLINGS.md` instead of relative ones, and document the convention in your team's onboarding.

### 1. Fill in `SIBLINGS.md`

Edit `SIBLINGS.md` at the root of this directory with every code repository your team maintains that PRDs will reference. For each row, set: `Project` name, `Path`, `Read first`, `Stack`, and `Status: active`. Delete the placeholder rows. Commit this as your first specforge commit — the registry is a prerequisite for step 2 of the workflow.

### 2. Bootstrap each service-heavy sibling's `SYSTEM_ARTIFACT.md` (incremental is fine)

For each sibling project with substantive domain logic (typically backend services), run a one-off Explore pass over its code:

1. Inside that sibling project, create `docs/SYSTEM_ARTIFACT.md` (or whatever path you declared in `SIBLINGS.md`) by copying `specforge/templates/system-artifact.md`.
2. Launch parallel Explore agents, one per domain the team already recognises in that project (auth, billing, ingest, reporting…), to fill in the sections.
3. For each domain, record: what exists, where it lives (file paths), external dependencies, and any known invariants.
4. Commit the file inside that sibling project. From that point on, every PRD that impacts the project must update it (enforced by the `system_artifact_diff` gate field).

**Incremental adoption is supported and expected.** A team with ten services does not have to bootstrap ten `SYSTEM_ARTIFACT.md` files on day 1 — that is not realistic. Start with the sibling your first PRD touches. Add a sibling to `SIBLINGS.md` with `Read first: CLAUDE.md` (no SYSTEM_ARTIFACT) and the first PRD that impacts that sibling may bootstrap its `SYSTEM_ARTIFACT.md` as part of the same change. The gate block's `system_artifact_diff:` list entry then points at the newly created file, and the registry row is updated in the same commit to declare its location.

UI-only or thin siblings may skip SYSTEM_ARTIFACT creation permanently — their PRDs will be grounded directly against their code during step 2 of the workflow.

**Do not retrofit PRDs for already-shipped features.** Historical PRDs are not a goal of this framework — the per-sibling `SYSTEM_ARTIFACT.md` files cover the "what exists now" question.

## Layout

specforge expects to live as a sibling directory to the code repositories it describes. A typical team layout looks like this:

```
<your-org>/                         # repo root (monorepo, or parent of sibling repos)
├── specforge/                      # this framework
│   ├── CLAUDE.md                   # this file. Framework rules. Loaded by AI tools automatically.
│   ├── CONVENTIONS.md              # detailed reference: naming, headers, sections, diagrams.
│   ├── SIBLINGS.md                 # team-mutable registry of sibling projects. Fill in on day 1.
│   ├── README.md                   # human-facing intro and adoption guide.
│   ├── templates/                  # PRD, ADR, SYSTEM_ARTIFACT templates.
│   ├── examples/                   # worked examples of each document type.
│   ├── agents/                     # reviewer briefings (backend, frontend, security, quality).
│   ├── NNN-your-prd.md             # your PRDs live at the specforge root.
│   └── ADR-NNN-your-adr.md         # your ADRs too.
├── api-service/                    # sibling project (example — a backend service)
│   ├── CLAUDE.md                   # project-specific rules (stack, lint, test conventions)
│   └── docs/
│       └── SYSTEM_ARTIFACT.md      # living state for api-service, referenced by the gate
└── web-client/                     # sibling project (example — a frontend)
    ├── CLAUDE.md                   # project-specific rules
    └── (no SYSTEM_ARTIFACT — UI-only, grounded from code directly)
```

When in doubt about format, consult `CONVENTIONS.md`. When in doubt about how a reviewer should behave, consult `agents/`. When in doubt about what a good PRD looks like, consult `examples/`. When in doubt about which sibling a PRD impacts, consult `SIBLINGS.md`.
