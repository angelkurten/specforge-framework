# specforge

**A framework for writing rigorous specifications (PRDs and ADRs) with AI as the primary author.**

Stack-agnostic. Domain-agnostic. Human-in-the-loop.

---

## What it is

specforge is an opinionated workflow and a set of templates for teams that use AI to draft design documents and want the output to be as careful as if a senior engineer had written it. It treats the AI as a drafting author, not a vibe-coding sidekick, and it pays for that with structure:

- **Grounding before writing.** Every endpoint, table, function, or config key in a PRD is verified against real code — or explicitly marked as new.
- **Multi-reviewer critique anchored to code.** Four parallel reviewers (backend, frontend, security, quality), each briefed with links to the actual code they are checking against.
- **A hard gate between `Draft` and `Implemented`.** No PRD gets promoted without a YAML gate block carrying `commit_hash`, `tests`, and `system_artifact_diff`.
- **A post-implementation re-review.** After the code ships, the same reviewer panel runs against the merge commit diff to verify the shipped code honors the frozen PRD — before the gate block can be filled.
- **A product-level [roadmap cycle](concepts/roadmap.md)** (v0.4.0+). `ROADMAP.md` captures problems, users, and evidence without technical detail. A two-panel workflow (generative + critical) produces items under the same grounding discipline PRDs apply to code.
- **A single source of truth for current system state.** `SYSTEM_ARTIFACT.md` is the only per-sibling living document; PRDs and ADRs are frozen snapshots.

## Four kinds of documents

| Document | Purpose | Lifecycle |
|---|---|---|
| **PRD** | A long ADR with implementation detail. What to build and how, for one feature or change. | Historical snapshot. Frozen at `Implemented`. |
| **ADR** | A focused architectural decision with alternatives and trade-offs. | Historical snapshot. Frozen at `Accepted`. |
| **`SYSTEM_ARTIFACT.md`** | Current state of one sibling project, organized by domain. One file per project that needs it. | Living document, updated when an impacting PRD ships. |
| **`ROADMAP.md`** | Product-level intent: problems, users, evidence, status, horizon. One global file at the specforge root. No technical detail. | Living document, mutable across generative cycles and PRD ships. |

The load-bearing distinction: **PRDs are not living docs**. A PRD marked `Implemented` is a frozen record of what the team decided and shipped at a specific commit. To learn what the system does *today*, read `SYSTEM_ARTIFACT.md` or the code. To learn *why* something was built the way it was, read the PRD that introduced it.

## Who should adopt it

!!! success "Adopt specforge if…"
    - You use AI as the primary author of design docs, not just as a code assistant.
    - Your specs have to stay coherent across multiple people, services, or phases.
    - You have been burned by AI-generated docs that were internally plausible but contradicted the actual code.
    - You want one file (`SYSTEM_ARTIFACT.md`) that a new engineer can read to understand what the system does today.
    - Your project spans **5+ services**, multi-author, multi-week design work.

!!! warning "Do not adopt specforge if…"
    - Your specs are single-author, single-session, and never leave your head.
    - You prefer to iterate in code and treat docs as optional.
    - You need a lightweight README generator or a simple PRD template with no process around it.
    - You are building a prototype — the ceremony will slow you down.

specforge trades speed for coherence. If you do not need coherence, the ceremony will slow you down.

## Where to go next

<div class="grid cards" markdown>

-   :material-rocket-launch: **[Quickstart](quickstart.md)**

    Step-by-step to bootstrap specforge in your repo.

-   :material-brain: **[Mental model](concepts/mental-model.md)**

    PRD vs ADR vs SYSTEM_ARTIFACT, and why the distinction matters.

-   :material-graph: **[Sibling projects](concepts/siblings.md)**

    How specforge handles a multi-service, multi-repo project.

-   :material-flow-chart: **[Workflow](workflow/overview.md)**

    The 9-step authoring process with the post-implementation re-review loop.

-   :material-map-outline: **[Roadmap](concepts/roadmap.md)**

    The product-level cycle (v0.4.0+): two-panel generator + critic workflow, evidence discipline, PII carve-out.

</div>
