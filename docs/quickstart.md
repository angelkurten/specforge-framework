# Quickstart

This guide walks you from zero to a first shipped PRD. It assumes you already have an AI coding assistant with tool access (Claude Code, Cursor, or similar) and at least one code repository you want to write specs for.

## Day 0 — Decide where specforge lives

specforge is designed to live **as a sibling directory to the code repositories it describes**, not as a subdirectory of any one of them.

A typical team layout:

```
<your-org>/                         ← repo root (monorepo or parent of sibling repos)
├── specforge/                      ← this framework
├── api-service/                    ← sibling project (example — a backend)
└── web-client/                     ← sibling project (example — a frontend)
```

Two equivalent options:

1. **Monorepo**: `specforge/` is a top-level directory inside your monorepo alongside your code directories.
2. **Sibling repos**: `specforge/` is its own git repo, cloned under the same parent directory as your code repos.

Either works. Both satisfy the `../api-service/` relative-path convention that specforge uses throughout.

```bash
# Option 1 — inside a monorepo
cd your-monorepo
git clone https://github.com/angelkurten/specforge-framework.git specforge

# Option 2 — sibling repos under one parent
mkdir your-org && cd your-org
git clone https://github.com/angelkurten/specforge-framework.git specforge
git clone git@github.com:your-org/api-service.git
git clone git@github.com:your-org/web-client.git
```

## Day 1 — Fill in `SIBLINGS.md`

`SIBLINGS.md` is the team-mutable registry of every code repository specforge will reference. It is the **prerequisite for grounding**: no PRD can reference a sibling that is not listed here.

Open [`SIBLINGS.md`](https://github.com/angelkurten/specforge-framework/blob/main/SIBLINGS.md) and add one row per repo your team maintains:

```markdown
| Project      | Path                  | Read first      | SYSTEM_ARTIFACT                  | Stack                          | Status |
|--------------|-----------------------|-----------------|----------------------------------|--------------------------------|--------|
| api-service  | `../api-service/`     | `CLAUDE.md`     | `docs/SYSTEM_ARTIFACT.md`        | Python 3.12, FastAPI, Postgres | active |
| web-client   | `../web-client/`      | `CLAUDE.md`     | —                                | TypeScript, React, Vite        | active |
```

Rules:

- **Name**: what PRDs will cite in their `Impacted Projects` table. Must match character-for-character.
- **Path**: relative from the specforge directory. Typically `../<name>/`.
- **Read first**: the file sub-agents Read before touching anything in this sibling — usually `CLAUDE.md`.
- **SYSTEM_ARTIFACT**: the path to the sibling's living state doc, or `—` if the sibling does not maintain one (e.g. a UI-only frontend that grounds directly from code).
- **Stack**: one-line summary so the team lead can pick which reviewers to dispatch.
- **Status**: `active` for currently-developed siblings, `retired` for historical ones. The registry is append-only — never delete rows, only mark them `retired`.

## Day 1 — Bootstrap `SYSTEM_ARTIFACT.md` per sibling (incremental)

For each sibling that has meaningful server-side state (databases, domain logic, workflows), create `<sibling>/docs/SYSTEM_ARTIFACT.md` using the template at `templates/system-artifact.md`. The SYSTEM_ARTIFACT is organized **by domain**, not by chronology — someone reading it should learn the system through its domain boundaries (auth, billing, notifications), not through the history of features.

!!! tip "Incremental adoption is supported"
    A team with 10 services does **not** bootstrap 10 SYSTEM_ARTIFACT files on day 1. Add the sibling to `SIBLINGS.md` with `SYSTEM_ARTIFACT: —` and the first PRD that impacts it will bootstrap its `SYSTEM_ARTIFACT.md` in the same change. UI-only siblings can skip this permanently.

The bootstrap itself is a one-off Explore pass: point your AI coding assistant at the sibling's code with one agent per domain (auth, billing, etc.) and ask it to fill in the template sections. This is the only time you reverse-engineer from code to docs — every later update happens through a PRD.

!!! danger "Do not retrofit PRDs for already-shipped features."
    specforge assumes the SYSTEM_ARTIFACT is the ground truth for current state. Writing historical PRDs for features you already shipped pollutes the timeline without adding information.

## Day 2 — Write your first PRD

1. **Copy the template**: `cp templates/prd.md NNN-your-feature.md` at the specforge root (where `NNN` is a 3-digit zero-padded monotonic number — check `ls` to avoid collisions).
2. **Follow the 9-step workflow** (see [Workflow](workflow/overview.md)) — in short:
    - **Step 1**: scope the request with the user (AskUserQuestion for bounded decisions).
    - **Step 2**: ground in reality — launch parallel Explore agents, one per impacted sibling, reading each sibling's `CLAUDE.md`, its `SYSTEM_ARTIFACT.md`, and the actual code for every component you plan to touch.
    - **Step 3**: plan the document — decide PRD vs ADR vs SYSTEM_ARTIFACT update, identify which siblings are impacted, decide if the change should be split into phase PRDs.
    - **Step 4**: draft. Every required section must be present. Mermaid for diagrams. Path column populated in the §9 Test Plan.
3. Use [`examples/prd-001-login-example.md`](https://github.com/angelkurten/specforge-framework/blob/main/examples/prd-001-login-example.md) as a reference for the level of detail expected.

## Day 3 — Run the review loop

**Step 5**: launch four reviewer agents **in parallel**, one per role (backend, frontend, security, quality), adapted to your domain. Each reviewer is briefed with:

- The PRD under review
- `{{REVIEW_MODE}}: draft`
- The path to the relevant sibling's `CLAUDE.md`
- Links to real code paths to verify against
- Their domain scope

Every finding carries severity: 🔴 blocker, 🟡 should-fix, 🟢 nit. Findings without `file:line` ground-truth anchors are rejected.

**Step 6**: consolidate findings. Apply fixes to the PRD.

**Step 7**: re-run **only** the reviewers whose domain had 🔴 blockers (scoped re-review, not a fresh pass).

## Day 4 — Ship as `Draft`, implement, then gate

**Step 8**: merge the PRD at `Status: Draft`. The gate block stays with `[TBD]` placeholders. Ask the user (AskUserQuestion with 3 bounded options): implement now, defer, or resume a different Draft.

**Step 9**: spawn an implementation team from the main session. You stay in the specforge directory throughout — you do not `cd` to code repos. Each sub-agent in the team receives an explicit brief with the PRD, absolute paths, and Read instructions for the sibling's `CLAUDE.md`.

After code lands, **before** filling the gate block, re-dispatch the step 5 reviewer panel with:

- `{{CODE_REFERENCES}}` = `git diff --name-only <commit_hash>`, scoped per sibling
- `{{REVIEW_MODE}}: post-implementation`

The reviewers now verify that the shipped code honors the frozen PRD. 🔴 blocks the gate — fixes go back to the implementation team, never into the PRD. 🟡 must be routed to one of three tracked destinations (fix-in-code / follow-up PRD with `Supersedes:` / `SYSTEM_ARTIFACT.md` note).

Only once the re-review clears do you fill the gate block and move `Status` to `Implemented`:

```yaml
commit_hash: a1b2c3d4
tests:
  - ../api-service/tests/auth/login_test.py
  - ../api-service/tests/auth/refresh_test.py
system_artifact_diff:
  - ../api-service/docs/SYSTEM_ARTIFACT.md#auth (commit a1b2c3d4)
```

## You are done

The PRD is now a frozen historical record of what you decided and shipped. Future changes to the same area go in a **new** PRD that declares `Supersedes: PRD-NNN` in its header. To learn what the system does today, read the impacted siblings' `SYSTEM_ARTIFACT.md`. To learn why, read the PRD that introduced each capability.

## Optional — Day 5: your first roadmap cycle

v0.4.0+ introduces a product-level [roadmap cycle](concepts/roadmap.md). If your team wants strategic context upstream of PRDs (evidence-backed problem framing, traceable "why this now vs later"), trigger the generative cycle in a fresh session:

```
"revisemos el roadmap con foco en <your-area>"
```

The lead agent dispatches the 4-agent generator panel (product / UX / market / support) + 4-agent critical panel (evidence rigor / devil's advocate / opportunity cost / risk) and you resolve findings before items land in `ROADMAP.md`. Every future PRD can then cite `Roadmap item: ROADMAP-NNN` in its header, linking its shipping trail to strategic intent.

The cycle is **optional** on day 1. PRDs authored without a `Roadmap item:` header get a retroactive item created at gate promotion, so the roadmap stays a complete index even if you never run a generative cycle.

## From here

[The full 9-step workflow](workflow/overview.md), [the mental model](concepts/mental-model.md), [the sibling-projects model](concepts/siblings.md), [the roadmap cycle](concepts/roadmap.md).
