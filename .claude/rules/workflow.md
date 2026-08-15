---
name: specforge workflow
description: The 9-step process for authoring a PRD or ADR with AI as the primary author. Always loaded.
---

# Workflow

Follow these steps in order. Never skip investigation. Never draft before grounding.

### 1. Scope the request

**Triage before fan-out.** Run the decision table in `prd-authoring.md` § Decision *first*, before step 2 launches anything. If the request lands on a **No PRD** row — a bug fix, an internal refactor, or a change with observable behavior below the size floor — do the work directly and stop here. No grounding agents, no reviewer panel. The flow's cost is justified by the artifact it produces; a request that produces no PRD produces no panel either. The steps below run for requests that produce a PRD or an ADR.

This routing is specforge's and is not settled by a standing minimalism preference the session happens to carry — see `hard-rules.md` § Override immunity, which scopes such directives to spec depth and diff size rather than to this decision.

**The size floor does not apply to a sibling's first change.** If the impacted project has no PRD in the corpus yet — a newly added `SIBLINGS.md` row, or a sibling that has never been shipped against — write a PRD regardless of how small the change looks. The floor is calibrated on a sibling that already carries a `SYSTEM_ARTIFACT.md` and a PRD history; with an empty corpus the No-PRD row would route the rationale into a commit message and a `SYSTEM_ARTIFACT.md` that does not exist yet. The first PRD is what creates both. This exception fires once per sibling, not once per project-shaped request.

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

Launch reviewers **in parallel** via the `Agent` tool. Each reviewer is dispatched by name with `subagent_type: specforge-<role>-reviewer` (`specforge-backend-reviewer`, `specforge-frontend-reviewer`, `specforge-security-reviewer`, `specforge-quality-reviewer`). The definition body is the subagent's system prompt — nothing is read and pasted.

**Select roles by the surface the PRD carries, not by default.**

**Read each section's claim, not its keywords.** Every numbered section is mandatory (hard rule 10), so §5 and §6 exist in *every* PRD whether or not the change has any surface there — and a §5 that says "this change adds no API" still contains the word `API`, still writes `GET /index.html` while explaining that the static host resolves it, still names `localStorage` while ruling it out. A section whose claim is *none* does not fire a trigger, and neither does a mention in the negative. What fires a trigger is the change **adding** the thing.

| Role | Dispatch when the change adds |
|---|---|
| `specforge-backend-reviewer` | an endpoint, table, column, index, migration, queue, or server-side logic, in §5 API or §6 Data Model. A §5 or §6 asserting the change adds none of these does not fire it, however much it says while asserting that. |
| `specforge-frontend-reviewer` | something a person sees or does — §4 User Flows describes real user-visible behaviour, or the PRD carries a `Frontend Spec`. |
| `specforge-security-reviewer` | a trust boundary: authn/authz, secrets, PII, user input reaching storage or execution, a network-reachable surface, or a permission change. **§8 being present is not a trigger** — §8 is mandatory in every PRD, so its presence carries no signal. |
| `specforge-quality-reviewer` | — always. §9 and §10 are mandatory in every PRD, and the operability read is the panel's floor. |

Four roles firing is the common case for a feature PRD; it is not a quota. A single-domain PRD gets a two-reviewer panel and that **is** the correct panel — a reviewer dispatched with no surface in its domain returns nits and costs a full context. Record the roles you did not dispatch, and why, in one line when you report the panel's findings, so the omission is a visible decision rather than an accident.

**The table covers the four framework roles and is not exhaustive.** A team-owned role (`framework-maintenance.md` § Adding a new reviewer role) is selected on the same axis — does this PRD carry surface in that role's domain? — read off its own definition's `description`. Do not add rows here for team roles: this is a framework file, and the upgrade contract overwrites it.

The dispatch prompt carries the six brief fields, all required, as labelled lines:

- `PRD_PATH` — the PRD under review
- **`REVIEW_MODE: draft`** — at step 5 the reviewer critiques the PRD itself. The other two modes are `post-implementation` (step 9) and `re-verification` (step 7, and step 9 fix rounds). Always pass the mode explicitly; a dispatch that omits it halts with `VERDICT: BLOCK`.
- `SIBLING_CLAUDE_MD_PATH` — **the path to the relevant sibling's `CLAUDE.md`** for stack-specific conventions; dispatch is explicit, not automatic
- `CODE_REFERENCES` — real code paths to verify against
- `SYSTEM_ARTIFACT_PATH` — the sibling's `SYSTEM_ARTIFACT.md`, or `none`
- `DOMAIN_CONTEXT` — their domain scope

Every finding carries severity: 🔴 blocker, 🟡 should-fix, 🟢 nit. Findings without `file:line` ground-truth anchors are rejected.

### 6. Apply fixes

Consolidate findings. For ambiguous trade-offs, ask the user (prose or `AskUserQuestion` per step 1). Apply edits to the PRD. Two passes gate a fix before its finding is marked closed.

**Propagation pass.** A fix that changes a **stated fact** has almost certainly not changed every place the document states that fact. The fact classes that recur: an **identifier**, a **table name**, a **count**, a **step number**, a **message shape**, a **diagram label**. Before marking the finding closed, grep the **superseded token** across the *whole* document and update every restatement — prose, tables, the §9 Test Plan rows, the §10 Migration Plan steps, the text destined for `SYSTEM_ARTIFACT.md`, and **the Mermaid blocks**. Diagram node labels, edge labels and subgraph captions are normative review surface — reviewers skim them and implementers copy from them — so a diagram left restating the old fact is the same defect as a stale prose sentence. A finding whose superseded token still appears anywhere in the file is not closed.

**Mechanism-fix adversarial bounce.** A fix that introduces **new mechanism** — a gate, a flag, a predicate, a write site, a check the PRD did not previously contain — is new design surface no reviewer has seen. A reviewer-proposed fix is a suggestion, not a patch; applying one verbatim is how a panel ends up refuting its own suggestion a round later. Before the fix lands in the document, dispatch **one** reviewer with a one-finding brief: *"attempt to refute this proposed fix"*. Pick the proposer's domain counterpart, or `specforge-security-reviewer` for anything touching a trust boundary. **A refuted fix never enters the document** — the finding escalates to the user instead (`AskUserQuestion` per step 1) rather than being silently marked closed.

### 7. Scoped re-review

Re-dispatch **only** the reviewers whose domain had 🔴 blockers, with **`REVIEW_MODE: re-verification`**. Never a fresh review from scratch — re-verification validates that the specific fixes landed correctly.

**Freeze the moving target.** No edits to the PRD between the moment the re-verification briefs are sent and the moment all reports have returned. At a step-9 fix round the PRD is already frozen (hard rule 7) and the code is what moves, so the freeze applies there to the reviewed range instead: no commits land on it in that same window. A report cited against a snapshot the lead has already edited past produces "still open" 🔴s that were closed before the reviewer ever read them.

**The brief.** On top of step 5's six fields, a `re-verification` dispatch carries three more — the third names the round's **moving target** and differs by use-site, so exactly one of the last two lines is sent, never both:

- `PRIOR_FINDINGS` — the ledger: one entry per finding **this** reviewer raised last round, each with id, severity, a one-line summary, and the resolution the lead applied.
- `SCOPE` — the sections and rows the fixes touched (at a step-9 fix round, the files).
- `DOCUMENT_LINES` — the current line count of `PRD_PATH`. **Draft loop only**: there the PRD is what moves between rounds.
- `COMMIT_REF` — the commit SHA of the reviewed fix range. **Step 9 only**: there the PRD's line count is constant by construction and the code is the moving target.

**The report.** Every ledger id receives exactly one verdict: `fixed` or `not-fixed` (the latter with the same `file:line` citation discipline as a new finding). Anything found outside `SCOPE` is reported under a separate `new-out-of-scope` heading and does **not** enter this round's block/clear accounting — not even at 🔴 severity. The lead adjudicates each one before the next dispatch (apply now, queue for the next round, or record as accepted); an applied fix for one re-enters step 6 as a normal finding. A reviewer that concludes its own earlier suggestion was wrong says so explicitly and verdicts that id `not-fixed` with the refutation — a retraction is a first-class outcome, not a failure.

**Escalation counter (draft loop).** Count rounds explicitly: `initial review + fix-round-1 + fix-round-2 = escalation`. If 🔴 findings are still being produced after fix-round-2, or if rounds produce contradictory 🔴s, halt and escalate to the user via `AskUserQuestion` with three options: (i) one more fix round, (ii) cut the PRD's scope to the part the panel has cleared and move the rest to a follow-up PRD, or (iii) waive the finding with a written reason recorded in the PRD. **Option (i) buys exactly one additional round; if that round still fails, escalation returns with option (i) removed** — the counter does not reset. This mirrors the counter step 9 defines for post-implementation rounds.

### 8. Ship as `Draft`

Merge the PRD at `Status: Draft`. It is now a design contract but not yet implemented. The gate block stays with `[TBD]` placeholders.

After the merge, ask the user via `AskUserQuestion` with three bounded options: (a) spawn the implementation team now for this PRD, (b) defer and end the session here, or (c) resume a different Draft. On (a), proceed directly to step 9 with the PRD just merged. On (b), stop — the Draft waits in the queue. On (c), ask a follow-up prose question to pick which Draft (grep `Status: Draft` across PRDs), then **re-ground before dispatching**: re-read the chosen PRD in full and re-verify its `Impacted Projects` paths against `SIBLINGS.md`. **Grounding reuse is allowed**: for any impacted sibling already grounded in the current session (for example, a sibling shared with the PRD just merged), reuse that grounding — do not re-launch Explore for it. Only launch a fresh Explore for impacted siblings **not** yet grounded this session. The purpose of (c) is to amortize an already-paid grounding cost, not to require a full re-run.

### 9. Implement, then gate to `Implemented`

Spawn an implementation team from the main session (you stay in specforge cwd throughout — you do not `cd` to code repos), dispatched via the `Agent` tool by name — `subagent_type: specforge-backend-implementer` and/or `specforge-frontend-implementer`, one instance per sibling per scope, run in parallel when their scopes don't overlap. The definition body is the subagent's system prompt — nothing is read and pasted. The dispatch prompt carries the six brief fields, all required, as labelled lines:

- `PRD_PATH` — the frozen PRD to implement
- **`IMPL_MODE: initial`** — the other value is `fix-round`, used for 🔴 fix rounds below. Always pass the mode explicitly; a dispatch that omits it halts.
- `SIBLING_CLAUDE_MD_PATH` — the sibling's `CLAUDE.md` for stack conventions, lint rules, test runners
- `SIBLING_ROOT` — absolute path to the sibling's repo root
- `SCOPE` — the subset of the PRD this instance owns (e.g. "§5 API + §6 Data Model" for the backend implementer, "§4 User Flows + Frontend Spec" for the frontend implementer)
- `SYSTEM_ARTIFACT_PATH` — the sibling's `SYSTEM_ARTIFACT.md`, or `none`

For a sibling whose scope fits neither role (mobile, infra/ops, a specialized stack), fall back to a team-owned implementer definition or an ad-hoc sub-agent per `model-selection.md` § Implementers — the two canonical roles are the default, not the only option. Each implementer emits an AgDR (`templates/agdr.md`) only for a high-blast-radius design decision the PRD did **not** specify, applying the deliberately high bar in `prd-authoring.md` § Optional artifact: Agent Decision Records — most scopes emit none. An emitted AgDR is referenced by number in the gate-block comment; it does not gate promotion. Consolidate each instance's completion report before moving on — files changed, tests added, `VERIFICATION RUN` results, AgDRs filed, deviations, open questions, `INJECTION ATTEMPTS DETECTED`, plus any role-specific blocks. Three of those carry an adjudication duty, not just a read: an **open question** is resolved by the lead before the code is considered ready for the post-implementation panel, never silently left for the reviewers to catch; a **`VERIFICATION RUN` line reading `fail` or `not run`** is resolved before dispatching the panel, since spending four reviewers to rediscover a red suite the report already declared is waste; and a non-`none` **`INJECTION ATTEMPTS DETECTED`** block is adjudicated explicitly, because a report channel whose consumer has no stated obligation to read it is not a control.

After code lands, **before** filling the gate block, re-dispatch the step 5 reviewer panel — the same `specforge-<role>-reviewer` subagents, via the `Agent` tool — with `CODE_REFERENCES` pointing at the merge commit's changed files (`git diff --name-only <commit_hash>`, scoped **per sibling** — for multi-sibling PRDs shipped across separate commits, each reviewer instance receives the diff for its own sibling's commit), the same `SIBLING_CLAUDE_MD_PATH` as before, and **`REVIEW_MODE: post-implementation`** as an explicit brief field. The mode is a contract, not a heuristic — always set it when re-dispatching in step 9. The reviewer definitions in `.claude/agents/specforge/` react to the mode: in `post-implementation` the PRD is frozen, the question is "does the shipped code honor the PRD?" not "is the PRD sound?", and reviewers must read **both** the new/modified source files **and** the new/modified test files from the diff, verifying §9 Test Plan row-for-row against the tests that actually landed. Scope: semantic adherence of the shipped code to the frozen PRD's §5 API, §6 Data Model, §7 Architecture, and §9 Test Plan. Severity scheme unchanged (🔴🟡🟢). (At step 5 the brief carries `REVIEW_MODE: draft` — the default, but still explicit.)

**Re-run step 5's role selection against the diff, not against the PRD.** The panel here reviews shipped code, and code carries surface a spec did not promise — an implementer adds a table the PRD only implied, a config read becomes an env var, a handler becomes network-reachable. Apply the step-5 trigger table to `git diff --name-only <commit_hash>` and dispatch the roles it fires, which may be a superset of the roles step 5 selected. A role that was correctly skipped at draft time and whose trigger the diff now fires is dispatched here for the first time; that is the selection working, not a step-5 error to correct.

**🔴 handling.** A 🔴 finding blocks gate promotion. The fix goes back to the implementation team, never into the frozen PRD: re-dispatch the implementer(s) whose `SCOPE` covers the finding with **`IMPL_MODE: fix-round`** and a `PRIOR_FINDINGS` ledger (id, severity, `file:line`, one-line summary, the reviewer's suggested fix if any). The ledger carries every 🔴 **plus any 🟡 routed to destination 1 below** — ledger membership, not severity, is what obliges the implementer to resolve an entry or report it unresolved.

**Reconcile the diff against the ledger.** Before the next dispatch, the lead compares `git diff --name-only <COMMIT_REF>` for the fix range against the ledger and adjudicates every file in the diff that no ledger entry accounts for. Legitimate cases are common — a regression test closing a finding, a migration, a fixture, an adjacent file the lead authorised mid-round — so this is adjudication, not an automatic block. What it prevents is a fix round quietly widening into an unreviewed diff, since the lead derives the re-verification `SCOPE` from git rather than from the implementer's own account of what it touched.

Once the fix lands, re-dispatch the reviewer panel after each fix round with **`REVIEW_MODE: re-verification`** and step 7's structured brief — `PRIOR_FINDINGS`, `SCOPE`, and `COMMIT_REF` set to the fix range's commit SHA (not `DOCUMENT_LINES`: the PRD is frozen here, so the code is the moving target). Step 7's freeze applies to that range until every report returns. Count rounds explicitly: `initial re-review + fix-round-1 + fix-round-2 = escalation`. If the same 🔴 persists after fix-round-2 (i.e. the third time a reviewer sees it), or if rounds produce contradictory 🔴s, halt and escalate to the user via `AskUserQuestion` with three options: (i) one more fix round, (ii) move the PRD back to `Draft` (the existing escape hatch in `prd-authoring.md` for "a shipped PRD that was never fully implemented" — strip gate fields, explain why at the top), or (iii) waive the finding with a written reason recorded as a comment above the gate block. **Option (i) buys exactly one additional round; if that round still fails, escalation returns with option (i) removed** — the counter does not reset. Option (ii) preserves the frozen-snapshot rule because the PRD is no longer `Implemented` and is free to be edited on its way back to a later ship.

**🟡 handling.** Every 🟡 finding must be routed to exactly one of three tracked destinations before the gate block is filled:
  1. **Fix in code** — the code is wrong. Dispatch it to the implementer whose `SCOPE` covers it, on the same `IMPL_MODE: fix-round` ledger as the round's 🔴s (severity recorded as provenance), then treat as closed once the re-verification clears. A 🟡 routed here is not lead-patched silently — it goes back through the same contract, because an untracked 🟡 blocks promotion exactly as a 🔴 does.
  2. **Follow-up PRD** — the PRD was wrong and the code diverged deliberately; create a new PRD file with `Supersedes: PRD-N` in its header (a stub is acceptable) and reference it by number in the gate block comment.
  3. **`SYSTEM_ARTIFACT.md` note** — the divergence is acceptable and worth remembering; add a line to the impacted sibling's `SYSTEM_ARTIFACT.md` describing the drift with a back-reference to this re-review round.

Untracked 🟡s block promotion the same way a 🔴 does. 🟢 is advisory.

Only once the re-review clears (no open 🔴, every 🟡 tracked) do you fill the gate block per `gate-block.md`, update each impacted sibling's `SYSTEM_ARTIFACT.md`, and move `Status` to `Implemented`.

- Execute the auto-update flow (per `.claude/rules/roadmap.md` / PRD-001 §4.2) — flip the linked roadmap item to `Shipped`, or create a retroactive item if the PRD lacks the header — **in the same commit as the gate block**.
