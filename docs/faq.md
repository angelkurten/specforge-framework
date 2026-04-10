# FAQ

## Is specforge for every project?

No. It is explicitly built for projects where **coherence across people, services, and weeks of design work** is worth a real ceremony tax. The sweet spot is:

- **5+ services or modules** that evolve at different cadences
- **Multiple engineers** touching the same area over time
- **Design work that spans weeks**, where rationale needs to outlive the author's memory

For a prototype, a 1-2 service side project, or any single-author single-session work, the ceremony will slow you down and the token spend will not pay for itself. Use a lighter tool.

## Does specforge explode the AI context window?

No — the opposite. The always-loaded framework surface is fixed and small:

- `CLAUDE.md` is ~45 lines (a pointer file, not a rulebook)
- The unscoped rule files under `.claude/rules/` (hard rules, workflow, gate block, PRD authoring) are a few hundred lines total

Everything with real volume — sibling code, `SYSTEM_ARTIFACT.md`, exploration — is dispatched to **sub-agents** that hold their own context and then disappear. The main session never loads sibling source or full living-state docs. See [Sibling projects → The dispatch model](concepts/siblings.md#the-dispatch-model-sub-agents-per-sibling).

## Why doesn't the template contain any project info?

Because a typical PRD touches 2-3 different sibling projects. If the template hard-coded "this is the Python backend PRD", it would only work for one sibling. Project metadata lives in [`SIBLINGS.md`](concepts/siblings.md), and each PRD references siblings by name through its `Impacted Projects` table. The template is intentionally stack-agnostic.

## What is `REVIEW_MODE`?

The reviewer briefings in `agents/*-reviewer.md` operate in two distinct modes:

- **`draft`** (step 5) — critiques the PRD itself. "Is this spec sound?"
- **`post-implementation`** (step 9) — verifies that the shipped code honors the frozen PRD. "Does the code honor the spec?"

The two modes use the same briefings but produce different findings: a `draft`-mode reviewer says "PRD §5 should specify rate limits"; a `post-implementation`-mode reviewer says "PRD §5 specifies rate limits but `<file>:<line>` does not enforce them". The team lead sets `{{REVIEW_MODE}}` explicitly on every dispatch; a missing mode causes the reviewer to emit `VERDICT: BLOCK` and halt.

## Can I run specforge without a SYSTEM_ARTIFACT.md for every sibling?

Yes. Incremental adoption is the default:

1. Register every sibling in `SIBLINGS.md` with `SYSTEM_ARTIFACT: —` (no living state doc yet).
2. The first PRD that impacts a given sibling can bootstrap its `SYSTEM_ARTIFACT.md` in the same change.
3. UI-only siblings (e.g. a pure React frontend with no domain state) can skip `SYSTEM_ARTIFACT.md` permanently and ground from code directly.

Never retrofit PRDs for features already shipped. The SYSTEM_ARTIFACT is the ground truth for current state.

## What happens when a PRD's implementation doesn't match the spec?

Post-implementation re-review catches this in step 9. Severity determines routing:

- **🔴 blocker**: the fix goes back to the implementation team, never into the frozen PRD. Re-dispatch after each fix round. After 2 persistent rounds, escalate to the user with three options — another fix round, revert the PRD to `Draft` (the single escape hatch), or waive with a written reason.
- **🟡 should-fix**: must be routed to exactly one of three tracked destinations — fix in code, a follow-up PRD with `Supersedes:`, or a note in the sibling's `SYSTEM_ARTIFACT.md` describing the drift. Untracked 🟡s block promotion the same way a 🔴 does.
- **🟢 nit**: advisory, not blocking.

See [Workflow → Step 9](workflow/overview.md#9-implement-then-gate-to-implemented).

## Can I edit an `Implemented` PRD?

No, with one exception. Hard rule 7 ("PRDs are frozen snapshots") has a single escape hatch documented in both `prd-authoring.md` and `workflow.md` step 9 option (ii):

> If post-implementation re-review surfaces an unresolvable 🔴, move the PRD back to `Draft` and strip the gate fields. At that point the PRD is no longer `Implemented`, no longer frozen, and is free to be edited on its way to a later ship.

The rule applies to the `Implemented` **state**, not to the file. Once you un-implement, the file is editable again.

For normal design evolution, do not edit the old PRD — write a new one with `Supersedes: PRD-N` in its header.

## Why Mermaid only for diagrams?

Because:

1. Mermaid diffs cleanly in git. ASCII art explodes line counts and breaks on rename.
2. Mermaid renders in GitHub, GitLab, and most docs sites natively.
3. Mermaid forces structure. ASCII art is easy to draw and hard to validate; Mermaid either parses or it doesn't.

Markdown tables and nested bullet lists are **not** considered diagrams and are still allowed for any structured content.

## How does specforge compare to a Ralph loop?

A Ralph loop (an agent iterating over the same task with checkpoints) is compatible with specforge, not opposed to it. Step 9 (implementation) is essentially a Ralph loop: you spawn a team of agents that loop over the code with the gate block as the checkpoint. The difference is that specforge gives the loop a **verifiable target** — the frozen PRD — so every iteration is measuring against the same contract. Without a spec, every Ralph loop iteration has to re-derive the architecture from scratch.

## Which AI tools does specforge work with?

specforge is written for Claude Code (the `.claude/rules/` directory is loaded automatically by Claude Code at session start), but the workflow itself is tool-agnostic. Any AI coding assistant that supports:

- Reading files
- Spawning parallel sub-agents or tool calls
- Running shell commands (for `git diff`, `ls`, etc.)

…can run the workflow. The specific integration points are:

- `CLAUDE.md` at the specforge root → auto-loaded by Claude Code; for other tools, include it as context manually.
- `.claude/rules/*.md` → Claude Code loads the unscoped files automatically and path-scoped files on match. For other tools, load the unscoped files manually.
- `agents/*-reviewer.md` briefings → used as sub-agent prompts; the templating variables (`{{PRD_PATH}}`, `{{REVIEW_MODE}}`, etc.) are filled by the team lead before dispatch.

## Where do I find the behavioral rules?

In [`/.claude/rules/`](https://github.com/angelkurten/specforge-framework/tree/main/.claude/rules):

- `hard-rules.md` — the 11 invariants that govern every PRD and ADR
- `workflow.md` — the 9-step authoring process
- `gate-block.md` — the Draft → Implemented promotion gate schema
- `prd-authoring.md` — required sections, naming, decision table
- `adr-specific.md` — ADR format rules (loads when editing `ADR-*.md`)
- `framework-maintenance.md` — rules for editing specforge itself

## I found a bug or want to contribute

Open an issue or PR at [github.com/angelkurten/specforge-framework](https://github.com/angelkurten/specforge-framework). Framework changes themselves follow the rules in `framework-maintenance.md` — loaded automatically when you edit a framework file.
