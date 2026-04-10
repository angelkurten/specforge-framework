# Mental model

specforge distinguishes three kinds of documents and refuses to let them drift into each other. Understanding the distinction is the single most important thing to internalize before writing your first PRD.

## The three document types

| Document | Purpose | Lifecycle |
|---|---|---|
| **PRD** | A long ADR with implementation detail. Specifies *what* to build and *how* for one feature or change. | Historical snapshot. Frozen at `Implemented`. |
| **ADR** | A focused architectural decision with alternatives and trade-offs. | Historical snapshot. Frozen at `Accepted`. |
| **`SYSTEM_ARTIFACT.md`** | Current state of one sibling project, organized by domain. One file per project that needs it. | Living document. Updated whenever a PRD that impacts the project ships. |

## Load-bearing distinction: PRDs are not living docs

A PRD marked `Implemented` is a **frozen record** of what the team decided and shipped at a specific commit. It is a historical snapshot, not a description of how the system currently works.

- To learn **what the system does today**, read the impacted sibling project's `SYSTEM_ARTIFACT.md` — or read the code directly.
- To learn **why something was built the way it was**, read the PRD that introduced it.

This separation is the foundation of everything else in specforge. Most AI-drafted spec systems fail because they treat PRDs as living docs that someone will "keep up to date" — and then nobody does, and the docs silently drift from the code until they become a liability. specforge accepts that docs will drift and solves the problem by making the drift irrelevant: PRDs are never supposed to match current state.

## Why PRDs get frozen

When a PRD is marked `Implemented`, three things happen:

1. The gate block at the bottom of the file is filled with `commit_hash`, `tests`, and `system_artifact_diff` — a machine-checkable fingerprint of the ship.
2. The impacted sibling's `SYSTEM_ARTIFACT.md` is updated in the same commit as the code, describing the new state.
3. The PRD itself is never edited again (except for typos or to mark it `Superseded by PRD-N`).

Design evolution happens in a **new** PRD that declares `Supersedes: PRD-N` against the old one. The old PRD stays as a frozen record of the original decision.

### The single escape hatch

Hard rule 7 ("PRDs are frozen snapshots") has exactly one exception, documented in `prd-authoring.md` and `workflow.md` step 9:

> If post-implementation re-review surfaces an unresolvable 🔴, move the PRD back to `Draft` and strip the gate fields. At that point the PRD is no longer `Implemented`, no longer frozen, and is free to be edited on its way to a later ship.

The rule applies to the `Implemented` state, not to the file. Once you un-implement, the file is editable again.

## Why SYSTEM_ARTIFACT.md is the only living doc

`SYSTEM_ARTIFACT.md` lives **inside** each sibling project (typically `<sibling>/docs/SYSTEM_ARTIFACT.md`), not inside specforge. This is deliberate:

- It travels with the code. Anyone cloning the sibling repo has it.
- It is updated in the same commit as the code change that modifies system state. The gate block's `system_artifact_diff` field enforces this.
- It is organized by domain (auth, billing, notifications) so a new engineer can learn the system through its boundaries, not through the chronology of features.
- It is the **only** document that is allowed to describe current state. PRDs describe intent at a past commit; the SYSTEM_ARTIFACT describes reality at HEAD.

!!! info "Teams with multiple siblings keep one SYSTEM_ARTIFACT.md per sibling."
    Do not merge them into a single cross-project file. Each sibling owns its own living state doc, because each sibling has its own commit history and deployment cadence.

## When to write which document

See the decision table in [PRD authoring rules](https://github.com/angelkurten/specforge-framework/blob/main/.claude/rules/prd-authoring.md):

| If the change is… | Write a… |
|---|---|
| A new feature or user-visible capability with API, data model, migration surface. | **PRD** |
| A set of features too large to ship atomically. | **Multiple phase PRDs**, each `Depends on` the previous, each independently shippable. |
| A pure architectural decision (library, pattern, build vs buy) with trade-offs and discarded alternatives. | **ADR** |
| A refinement of a shipped feature that changes observable behavior. | **New PRD** with `Supersedes: PRD-N` in its header. Do not edit PRD-N. |
| A bug fix or internal refactor without observable behavior change. | **No PRD.** Update the relevant sibling's `SYSTEM_ARTIFACT.md` only if system state changed. |
| A factual correction (typo, wrong path) to an existing PRD. | **Edit in place**, note the correction at the top. Do not bump status. |
| A discovery that a shipped PRD was never fully implemented. | **Move it back to `Draft`**, strip the gate fields, explain why at the top. |

## Related

- [Sibling projects](siblings.md) — the multi-project model that makes the SYSTEM_ARTIFACT split make sense.
- [Workflow](../workflow/overview.md) — how the three document types are produced by the 9-step process.
