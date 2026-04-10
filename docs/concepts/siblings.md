# Sibling projects

specforge is designed from day one as a **multi-project** framework. A single PRD typically impacts two or three distinct code repositories — an API service, a web client, maybe a background worker — each with its own stack, its own conventions, and its own living state. This page explains how that works and why it keeps the framework's context budget bounded.

## The multi-project model in one diagram

```
<your-org>/                         ← repo root (monorepo or parent of sibling repos)
├── specforge/                      ← this framework, as a sibling directory
│   ├── SIBLINGS.md                 ← registry of every code repo specforge knows about
│   ├── NNN-your-prd.md             ← your PRDs live at the specforge root
│   └── ADR-NNN-your-adr.md         ← your ADRs too
├── api-service/                    ← sibling project (example — a backend)
│   ├── CLAUDE.md                   ← project-specific rules (stack, lint, tests)
│   └── docs/
│       └── SYSTEM_ARTIFACT.md      ← living state for api-service
└── web-client/                     ← sibling project (example — a frontend)
    ├── CLAUDE.md                   ← project-specific rules
    └── (no SYSTEM_ARTIFACT — UI-only, grounds from code directly)
```

Every sibling is **independent**: its own git repo (or its own directory in a monorepo), its own stack, its own `CLAUDE.md` with project-specific rules, and optionally its own `SYSTEM_ARTIFACT.md` living state doc.

## The registry: `SIBLINGS.md`

`SIBLINGS.md` at the root of specforge is the **team-mutable registry** of every code repository specforge knows about. It has one row per repo:

| Project | Path | Read first | SYSTEM_ARTIFACT | Stack | Status |
|---|---|---|---|---|---|
| api-service | `../api-service/` | `CLAUDE.md` | `docs/SYSTEM_ARTIFACT.md` | Python 3.12, FastAPI, Postgres | active |
| web-client | `../web-client/` | `CLAUDE.md` | — | TypeScript, React, Vite | active |

- **Name**: what PRDs cite. Must match character-for-character in the `Impacted Projects` table of every PRD.
- **Path**: relative from the specforge directory. Always starts with `../`.
- **Read first**: the file sub-agents Read before touching anything in this sibling — usually `CLAUDE.md`.
- **SYSTEM_ARTIFACT**: path to the living state doc, or `—` if the sibling does not maintain one (e.g. UI-only frontend).
- **Stack**: one-line summary so the team lead can pick which reviewers to dispatch.
- **Status**: `active` or `retired`. The registry is **append-only** — never delete rows.

### Why append-only

Frozen PRDs reference siblings by name. If you rename or delete a sibling row, older `Implemented` PRDs become uncitable. The registry records history; active work references only the `Status: active` rows.

## Why the template has no project info

This is the most common source of confusion. `templates/prd.md` intentionally contains **zero** project-specific information:

- No stack name.
- No path to code.
- No reference to "the backend" or "the frontend" or any particular framework.

Instead, every PRD declares its impacted siblings in a mandatory header table:

```markdown
## Impacted Projects

| Project       | Impact |
|---------------|--------|
| **api-service** | New `users` table, new `POST /auth/login` endpoint, new AuthService |
| web-client    | New `/login` page, new `useSession` hook |
```

The `Project` cell must match a row name in `SIBLINGS.md`. From there, anything else about the sibling — its path, its stack, where its `CLAUDE.md` lives, where its `SYSTEM_ARTIFACT.md` lives — is resolved from the registry, not duplicated in the PRD.

!!! question "Why not put project info in the template?"
    Because a typical PRD touches 2-3 different siblings. If the template hard-coded "this is the Python backend PRD", it would only work for one sibling. The whole point of SIBLINGS.md is to keep project metadata in one place so multiple PRDs can reference the same sibling without drift.

## The dispatch model: sub-agents per sibling

The second reason the multi-project split matters is **context budget**.

The specforge main session — where you drive the AI while authoring a PRD — loads only:

- `CLAUDE.md` (~45 lines, the pointer file)
- The unscoped rule files under `.claude/rules/` (hard rules, workflow, gate block, PRD authoring — a few hundred lines total)

It does **not** load sibling code, sibling `CLAUDE.md`s, or sibling `SYSTEM_ARTIFACT.md`s. That volume lives in **sub-agents**, spawned on demand and destroyed after reporting.

Specifically:

- **Step 2 (Ground in reality)** launches one parallel Explore agent per impacted sibling. Each agent Reads that sibling's `CLAUDE.md`, its `SYSTEM_ARTIFACT.md`, and the actual code for every component the PRD will touch. It reports findings back to the main session and dies. The main session keeps the findings summary, not the raw code.
- **Step 5 (Multi-reviewer critique)** launches four reviewers in parallel, **one instance per sibling × reviewer role**. Each reviewer is briefed with only that sibling's `CLAUDE.md` path and only the code paths relevant to its domain scope. The reviewers emit reports with `file:line` citations; the main session consolidates.
- **Step 9 (Implement, then gate)** spawns an implementation team from the main session. Each sub-agent is briefed with absolute paths to the code that must change and explicit instructions to Read the sibling's `CLAUDE.md` before touching anything. You stay in the specforge directory the whole time — the main session never `cd`s into a sibling repo.

This is the opposite of loading the entire project into one prompt. The main session's always-loaded surface is tiny and fixed; the heavy reading happens in short-lived sub-agents that hold their context and then disappear.

## Dispatch is explicit, not automatic

Claude Code does **not** auto-load sibling `CLAUDE.md` files. It walks the directory tree **up** from the cwd (ancestors) and loads subdirectory `CLAUDE.md`s on demand, but it never walks to **siblings**.

When the team lead dispatches a sub-agent to work against a sibling, the team lead must **explicitly brief** the sub-agent with the path to that sibling's `CLAUDE.md` and an instruction to Read it first. The reviewer briefings in `agents/*-reviewer.md` encode this as a required step: `{{SIBLING_CLAUDE_MD_PATH}}` is one of the five mandatory variables, and "Read `{{SIBLING_CLAUDE_MD_PATH}}` first" is the first step in every briefing's action checklist.

Without this dispatch-by-brief pattern, a sub-agent would ground against specforge's generic rules and miss the sibling's stack-specific idioms (lint, test runner, layering, error handling, transaction patterns). The brief is the only mechanism that crosses the sibling boundary.

## Incremental adoption

You do not need to bootstrap all your siblings on day 1. A team with 10 services can:

1. Register all 10 in `SIBLINGS.md` with `Read first: CLAUDE.md` only (no `SYSTEM_ARTIFACT.md`).
2. Start writing PRDs for changes the team is actively making.
3. The first PRD that impacts a given sibling can bootstrap its `SYSTEM_ARTIFACT.md` in the same change.
4. UI-only siblings can skip the `SYSTEM_ARTIFACT.md` permanently — they ground directly from code.

Never retrofit PRDs for features already shipped. The SYSTEM_ARTIFACT is the ground truth for current state; writing historical PRDs for shipped features pollutes the timeline without adding information.

## Related

- [Quickstart](../quickstart.md) — the day-by-day bootstrap guide.
- [Mental model](mental-model.md) — why SYSTEM_ARTIFACT is the only living doc.
- [Workflow](../workflow/overview.md) — how dispatch happens at each step.
