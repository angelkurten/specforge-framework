# SIBLINGS

Team registry of sibling projects that specforge PRDs reference. **Fill this in before writing any PRD.**

This file is **team data**, not framework data — upgrading specforge (pulling a new version of `CLAUDE.md`, `CONVENTIONS.md`, templates, etc.) never touches this file. Treat it like a config: it belongs to you, not to the framework.

---

## Registry

| Project | Path | Read first | Stack | Status |
|---|---|---|---|---|
| **api-service** | `../api-service/` | `CLAUDE.md`, `docs/SYSTEM_ARTIFACT.md` | *(fill in: language, framework, datastore)* | active |
| **web-client** | `../web-client/` | `CLAUDE.md` | *(fill in)* | active |
| *(add one row per project your team maintains; delete these placeholder rows)* | | | | |

---

## Rules

### The `Project` column is the shared key

PRDs reference projects by the name in the first column and nothing else. No path, no repo slug, no stack fragment — just the name. The registry is the single place where everything else about a project lives. If a reader needs to know where `api-service` is or what stack it runs, they look here, not at the PRD.

This makes `CLAUDE.md` rule 11 mechanically verifiable: every row in a PRD's `Impacted Projects` table must match, character-for-character, a `Project` name in this file.

### Draft PRDs reference active rows only

A PRD in `Status: Draft` may only cite projects with `Status: active` in this registry. Historical PRDs (`Implemented`, `Superseded`) may cite retired rows too — those are frozen references to projects that existed at ship time.

### The registry is append-only

When a sibling is renamed, deleted, or sunset, **do not remove its row** — mark it as retired. Historical PRDs must continue to resolve cleanly against the registry without edits.

**Renaming a sibling** (`api-service` → `core-api`):

1. Add the new row (`**core-api**`) with `Status: active` and the new metadata.
2. Update the old row's status to `retired: YYYY-MM-DD → renamed to core-api`.
3. Any `Draft` PRD that was referencing `api-service` must be rewritten to reference `core-api` before promotion.
4. `Implemented` PRDs stay frozen and continue pointing at `api-service` — the retired row is what they resolve to.

**Retiring a sibling** (project sunset):

1. Update the row's status to `retired: YYYY-MM-DD → sunset`.
2. `Draft` PRDs that reference the sunset sibling must be updated or moved to `Superseded` before promotion.
3. `Implemented` PRDs stay frozen.

**Never delete a row.** A deleted row makes every historical PRD that referenced it unverifiable.

### Each sibling may have its own `CLAUDE.md`

A sibling's `CLAUDE.md` contains project-specific rules: lint conventions, test runners, deploy pipelines, stack idioms. specforge composes with them rather than overriding — when an Explore agent reads a sibling, it reads that sibling's `CLAUDE.md` first, then applies specforge's framework rules on top.

### `SYSTEM_ARTIFACT.md` lives inside the sibling, not in specforge

A sibling with substantive domain logic (typically backend services) keeps its `SYSTEM_ARTIFACT.md` at the path declared in the `Read first` column, usually `docs/SYSTEM_ARTIFACT.md`. specforge never contains a `SYSTEM_ARTIFACT.md` at its own root.

UI-only or thin siblings may leave the `Read first` column showing only `CLAUDE.md` (no SYSTEM_ARTIFACT). Their PRDs will be grounded directly against their code during workflow step 2.

### Relative paths and portability

Paths in the `Path` column are relative to the specforge directory. They assume specforge is a sibling directory to the code repos — this works for two layouts:

- **Monorepo**: specforge is a top-level directory, siblings are other top-level directories, and `../api-service/` resolves within the monorepo.
- **Independent sibling repos**: specforge is cloned under the same parent as the code repos (e.g. `~/work/specforge`, `~/work/api-service`), and `../api-service/` resolves across repos.

Absolute paths are allowed but less portable — a laptop and a CI runner will disagree on them. Use relative paths if your team can guarantee the layout, absolute paths otherwise. The workflow's grounding step (`CLAUDE.md` § Workflow step 2) halts with an error if any registry path does not resolve on the machine running the tooling — silent degradation is never acceptable.

### `Read first` is relative to the sibling root

Paths in the `Read first` column are relative to the sibling project, not to specforge. So `<Path>/<Read first>` (e.g. `../api-service/` + `CLAUDE.md` = `../api-service/CLAUDE.md`) must resolve to a real file.

---

## Incremental adoption

Teams adopting specforge rarely bootstrap every sibling on day 1. The registry supports incremental growth:

- A sibling may be added with `Read first: CLAUDE.md` only (no `SYSTEM_ARTIFACT.md` entry yet). PRDs that impact that sibling ground from code directly.
- **The first PRD that impacts a sibling without `SYSTEM_ARTIFACT.md` may bootstrap that sibling's `SYSTEM_ARTIFACT.md` as part of the same change.** The gate block's `system_artifact_diff:` list entry then points at the newly created file, and the sibling's `Read first` column is updated in the same commit to declare the new file's location.
- A team with ten services does not have to bootstrap ten `SYSTEM_ARTIFACT.md` files on day 1. Start with the sibling your first PRD touches. Grow organically.
