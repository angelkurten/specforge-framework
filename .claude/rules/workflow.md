---
name: specforge workflow
description: The 9-step process for authoring a PRD or ADR with AI as the primary author. Always loaded.
---

# Workflow

Follow these steps in order. Never skip investigation. Never draft before grounding.

### 1. Scope the request

For bounded decisions (2-4 mutually exclusive options you can confidently enumerate), use `AskUserQuestion` — one question per call. For exploration, clarifications, or unbounded spaces, ask in prose. If the user asks to answer in prose or explain first, comply immediately.

If the request corresponds to an existing `ROADMAP.md` item, capture its `ROADMAP-NNN` and surface it in the PRD's `Roadmap item:` header. If no item exists and the request is non-trivial product work, consider running the generative cycle first (per `.claude/rules/roadmap.md`).

### 2. Ground in reality

**Precondition**: verify every registry path in `SIBLINGS.md` resolves on the current machine for the siblings this change will impact. If any path does not resolve, halt and ask the user. Never proceed with partial grounding — silent degradation produces PRDs that cite code that does not exist.

Launch parallel Explore agents (or equivalent), **one per impacted sibling**. Each agent reads, in order:

1. That sibling's `CLAUDE.md` (project-specific rules on top of specforge's).
2. That sibling's `SYSTEM_ARTIFACT.md`, if the registry declares one.
3. Related existing PRDs and ADRs in specforge (search by keyword, read `Depends on` chains).
4. The actual code inside that sibling for every component the change touches.

Do not proceed to drafting until the findings from every sibling agent point to concrete files, functions, tables, or endpoints that already exist in that sibling. **Never invent** — if something is new, mark it explicitly as new.

### 3. Plan the document

Before writing, decide:

- PRD, ADR, or just a `SYSTEM_ARTIFACT.md` update? See the decision table in `prd-authoring.md`.
- Which sibling projects are impacted? This becomes the mandatory `Impacted Projects` table.
- Single shippable unit, or decompose into phase PRDs (`NNN-phase-1-…`, `NNN-phase-2-…`) each declaring `Depends on` their predecessor? Split if the feature cannot ship in one commit or exceeds ~1500 lines of spec.

### 4. Draft

Write the PRD/ADR using `templates/prd.md` or `templates/adr.md`. Every required section must be present (see `prd-authoring.md`). Mermaid only for diagrams — ASCII art is forbidden.

### 5. Multi-reviewer critique

Launch reviewers **in parallel** — a typical panel of 4 (backend, frontend, security, quality), adapted to the domain. Each reviewer is briefed with:

- The PRD under review
- Links to real code paths to verify against
- **The path to the relevant sibling's `CLAUDE.md`** for stack-specific conventions (see `agents/*-reviewer.md` briefings — dispatch is explicit, not automatic)
- Their domain scope
- **`{{REVIEW_MODE}}: draft`** — at step 5 the reviewer critiques the PRD itself. The alternative mode is `post-implementation`, set only in step 9 (see that step). Always pass the mode explicitly.

Every finding carries severity: 🔴 blocker, 🟡 should-fix, 🟢 nit. Findings without `file:line` ground-truth anchors are rejected.

### 6. Apply fixes

Consolidate findings. For ambiguous trade-offs, ask the user (prose or `AskUserQuestion` per step 1). Apply edits to the PRD.

### 7. Scoped re-review

Re-run **only** the reviewers whose domain had 🔴 blockers. Never a fresh review from scratch — re-review validates that the specific fixes landed correctly.

### 8. Ship as `Draft`

Merge the PRD at `Status: Draft`. It is now a design contract but not yet implemented. The gate block stays with `[TBD]` placeholders.

After the merge, ask the user via `AskUserQuestion` with three bounded options: (a) spawn the implementation team now for this PRD, (b) defer and end the session here, or (c) resume a different Draft. On (a), proceed directly to step 9 with the PRD just merged. On (b), stop — the Draft waits in the queue. On (c), ask a follow-up prose question to pick which Draft (grep `Status: Draft` across PRDs), then **re-ground before dispatching**: re-read the chosen PRD in full and re-verify its `Impacted Projects` paths against `SIBLINGS.md`. **Grounding reuse is allowed**: for any impacted sibling already grounded in the current session (for example, a sibling shared with the PRD just merged), reuse that grounding — do not re-launch Explore for it. Only launch a fresh Explore for impacted siblings **not** yet grounded this session. The purpose of (c) is to amortize an already-paid grounding cost, not to require a full re-run.

### 9. Implement, then gate to `Implemented`

Spawn an implementation team from the main session (you stay in specforge cwd throughout — you do not `cd` to code repos). Each sub-agent in the team receives an explicit brief containing:

- The PRD to implement
- Absolute paths to the sibling's code that must change
- **Instructions to read the sibling's `CLAUDE.md` via the Read tool** before touching any code (stack conventions, lint rules, test runners)
- The subset of the PRD relevant to their scope

After code lands, **before** filling the gate block, re-dispatch the step 5 reviewer panel with `{{CODE_REFERENCES}}` pointing at the merge commit's changed files (`git diff --name-only <commit_hash>`, scoped **per sibling** — for multi-sibling PRDs shipped across separate commits, each reviewer instance receives the diff for its own sibling's commit), the same `{{SIBLING_CLAUDE_MD_PATH}}` as before, and **`{{REVIEW_MODE}}: post-implementation`** as an explicit brief field. The mode is a contract, not a heuristic — always set it when re-dispatching in step 9. The briefings in `agents/*-reviewer.md` react to the mode: in `post-implementation` the PRD is frozen, the question is "does the shipped code honor the PRD?" not "is the PRD sound?", and reviewers must read **both** the new/modified source files **and** the new/modified test files from the diff, verifying §9 Test Plan row-for-row against the tests that actually landed. Scope: semantic adherence of the shipped code to the frozen PRD's §5 API, §6 Data Model, §7 Architecture, and §9 Test Plan. Severity scheme unchanged (🔴🟡🟢). (At step 5 the brief carries `{{REVIEW_MODE}}: draft` — the default, but still explicit.)

**🔴 handling.** A 🔴 finding blocks gate promotion. The fix goes back to the implementation team, never into the frozen PRD. Re-dispatch the re-review after each fix round. Count rounds explicitly: `initial re-review + fix-round-1 + fix-round-2 = escalation`. If the same 🔴 persists after fix-round-2 (i.e. the third time a reviewer sees it), or if rounds produce contradictory 🔴s, halt and escalate to the user via `AskUserQuestion` with three options: (i) one more fix round, (ii) move the PRD back to `Draft` (the existing escape hatch in `prd-authoring.md` for "a shipped PRD that was never fully implemented" — strip gate fields, explain why at the top), or (iii) waive the finding with a written reason recorded as a comment above the gate block. **Option (i) buys exactly one additional round; if that round still fails, escalation returns with option (i) removed** — the counter does not reset. Option (ii) preserves the frozen-snapshot rule because the PRD is no longer `Implemented` and is free to be edited on its way back to a later ship.

**🟡 handling.** Every 🟡 finding must be routed to exactly one of three tracked destinations before the gate block is filled:
  1. **Fix in code** — the code is wrong, apply the fix, treat as closed.
  2. **Follow-up PRD** — the PRD was wrong and the code diverged deliberately; create a new PRD file with `Supersedes: PRD-N` in its header (a stub is acceptable) and reference it by number in the gate block comment.
  3. **`SYSTEM_ARTIFACT.md` note** — the divergence is acceptable and worth remembering; add a line to the impacted sibling's `SYSTEM_ARTIFACT.md` describing the drift with a back-reference to this re-review round.

Untracked 🟡s block promotion the same way a 🔴 does. 🟢 is advisory.

Only once the re-review clears (no open 🔴, every 🟡 tracked) do you fill the gate block per `gate-block.md`, update each impacted sibling's `SYSTEM_ARTIFACT.md`, and move `Status` to `Implemented`.

- Execute the auto-update flow (per `.claude/rules/roadmap.md` / PRD-001 §4.2) — flip the linked roadmap item to `Shipped`, or create a retroactive item if the PRD lacks the header — **in the same commit as the gate block**.
