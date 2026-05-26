# PRD-002: SDD-2026 Framework Alignment

**Status**: Draft
**Date**: 2026-05-26
**Author**: AI-assisted
**Priority**: P2
**Depends on**: PRD-001
**Supersedes**: None

> **Note**: This is a **framework-internal PRD** — specforge applying its own
> process to change itself. The impacted sibling is `specforge` (see
> [`SIBLINGS.md`](SIBLINGS.md)). Framework-maintenance rules apply (see
> [`.claude/rules/framework-maintenance.md`](.claude/rules/framework-maintenance.md)).
>
> **Contract revision**: this PRD revises the conformance contract established
> by [PRD-001 §9 row #25](001-product-roadmap.md#9-test-plan) — the
> `hard_rules_12_test.md` pass-criterion that hard-codes "rule count is exactly
> 12 / no `^13\.` line exists". That criterion was a caption-sync guard, not a
> permanent ceiling on the invariant set. PRD-002 introduces hard rule 13 and
> rewrites the guard to assert *caption synchronization* (the `N invariants`
> caption equals the highest enumerated rule number) instead of a hard-coded
> 12. PRD-001 stays frozen; the living test artifact is updated under this PRD.

## Impacted Projects

| Project | Impact |
|---------|--------|
| **specforge** | Edits to `.claude/rules/hard-rules.md` (new invariant 13 + an "Override immunity" preamble), `.claude/rules/prd-authoring.md` (two new decision-table rows + an optional § 2 Goals phrasing note + an "Optional artifact: Agent Decision Records" section + AgDR naming row), `.claude/rules/workflow.md` (step 9 AgDR-emission brief line), `CONVENTIONS.md` (AgDR naming subsection in § 2), `templates/prd.md` (§ 2 Goals comment), `README.md` / `README.es.md` (template-list entry + "12 invariants" → "13 invariants" caption), `docs/faq.md` (invariant count fix). New file `templates/agdr.md`. Revised test `tests/roadmap/hard_rules_12_test.md`; new tests under `tests/sdd-2026/`. |

---

## 1. Problem Statement

specforge's authoring discipline predates the 2026 consolidation of spec-driven
development (SDD) practice around tools such as GitHub spec-kit, AWS Kiro,
Tessl, and OpenSpec. A four-agent analysis (tooling, requirements, governance,
devil's-advocate) compared specforge against those tools and the cross-cutting
critique in Martin Fowler's *"SDD: three tools"*. The finding: specforge already
resolves the headline failure modes (frozen-vs-living separation, a verifiable
gate, a defined problem-size band), but carries five concrete, low-risk gaps:

1. The PRD-vs-ADR-vs-`SYSTEM_ARTIFACT` decision table has no explicit *lower*
   bound — small observable changes below the PRD size floor have no named
   destination, inviting either over-documentation (Kiro's "sledgehammer")
   or silent drift.
2. The hard rules do not state their own precedence against later-context
   instructions, leaving conflict resolution opaque (the "constitution file"
   idea from spec-kit, applied to specforge's existing `hard-rules.md`).
3. Reactive goals in § 2 are phrased as open-ended capabilities, not as
   trigger/condition statements that map to a § 9 test row (the testable core
   of EARS notation).
4. Nothing prohibits treating a frozen PRD/ADR as a code-regeneration source
   (Tessl's "spec-as-source"), a pattern that would contradict the frozen-
   snapshot invariant and reintroduce model-driven-development non-determinism.
5. Design decisions a sub-agent makes autonomously during implementation
   (`workflow.md` step 9) have no traceability artifact equivalent to the ADRs
   specforge requires for human decisions (the Agent Decision Record idea).

## 2. Goals

- Add a decision-table row routing small observable changes below the PRD size
  floor to a `SYSTEM_ARTIFACT.md` note plus commit rationale, with an explicit
  escalation condition.
- State an "Override immunity" precedence rule for the hard rules: when a later
  instruction conflicts with an invariant, the invariant wins and the conflict
  is surfaced.
- Provide an **optional** § 2 Goals phrasing for reactive goals so that, where
  it removes ambiguity, a goal maps directly to a § 9 test row — without
  mandating EARS or adding an Acceptance-Criteria section.
- Add hard rule 13 prohibiting spec-as-source code regeneration from frozen
  PRDs/ADRs.
- Define the Agent Decision Record (AgDR) as an opt-in, deliberately-rare
  artifact for high-blast-radius autonomous decisions, with a template and a
  naming convention, that does **not** gate promotion.
- Keep the `N invariants` caption synchronized with the enumerated rule count
  and revise the PRD-001 §9 #25 guard accordingly.

## 3. Non-Goals

- No new mandatory PRD section, and no EARS/Gherkin requirement. The § 2
  phrasing is a suggestion only.
- No bidirectional spec↔code sync, no `@generate`/`@test` tags, no
  spec-as-source tooling. Hard rule 13 forbids it.
- No migration to `AGENTS.md`; `CLAUDE.md` auto-load is retained.
- No separate `constitution.md`; `hard-rules.md` is the constitution.
- AgDR is not retrofitted to historical ships and never blocks a gate.

## 4. User Flows / Design

Not user-facing in the runtime sense; the "users" are AI authors and reviewers.
The behavioral surface is the rule files and templates, exercised at authoring
time (§ 2 Goals phrasing, decision-table routing), at review time (override
immunity, hard rule 13), and at implementation time (AgDR emission in
`workflow.md` step 9).

## 5. API

The "API" of this change is the document-format and rule-file contract; no HTTP
endpoints and no runtime code.

- **AgDR document shape** — see [`templates/agdr.md`](templates/agdr.md). Header
  fields: `Status: Recorded`, `Date`, `Agent`, `Triggering PRD`, `Sibling`,
  `Commit`; sections: 1 Decision, 2 Why the PRD did not cover this,
  3 Alternatives Considered, 4 Blast radius and reversal cost, 5 Signals to
  Reconsider *(optional)*.
- **AgDR naming** — `AgDR-NNN-kebab-case-title.md` at specforge root, independent
  numbering sequence (`CONVENTIONS.md` § 2; `prd-authoring.md` § Naming).
- **Decision-table additions** — two rows in `prd-authoring.md`: small
  observable change → `SYSTEM_ARTIFACT.md` note; autonomous high-blast-radius
  decision → optional AgDR.
- **Hard rule 13 wording** — "PRDs and ADRs are not a code-regeneration source."

## 6. Data Model

Not applicable. specforge has no datastore; all artifacts are markdown files on
disk. No tables, columns, or migrations.

## 7. Architecture

Single-component change to the specforge rule/template/doc set. No cross-service
interaction. The rule files load per existing mechanics (unscoped rules every
session; path-scoped on file match) — this PRD adds no new loading behavior.

## 8. Security

specforge has no runtime, no auth surface, and no PII store; the security
surface is prompt-injection and instruction-precedence within an authoring
session.

- **Threat: later-context instruction override.** Adversarial or accidental
  content arriving after the rules load — a PRD body, sub-agent brief, quoted
  evidence, tool result, injected system reminder, or text retrieved from a
  sibling's files — could attempt to waive a hard rule. **Mitigation:** the
  "Override immunity" preamble in `hard-rules.md` scopes itself to *any*
  later-arriving content (the channel list is explicitly illustrative, not
  exhaustive) and directs the agent to surface conflicts rather than silently
  resolve them. It composes with the existing `untrusted-evidence` fence
  (`roadmap.md`): the fence operates at the data layer (escaping, per-entry
  marking) and immunity at the policy layer. Note the fence covers only the
  roadmap briefings, so within PRD authoring/review the immunity preamble is the
  sole defense — which is why its scope is written non-exhaustively.
- **Threat: spec-as-source regeneration.** Treating a frozen PRD as a code
  generator could non-deterministically reintroduce removed/insecure code.
  **Mitigation:** hard rule 13 forbids the pattern — whole-file *and*
  partial/section regeneration, and automated spec↔code sync in either
  direction. The bidirectional non-goal (§ 3) is backed by the invariant, not by
  this frozen PRD alone.
- **No new secrets, credentials, or network calls are introduced.** AgDR header
  fields (`Agent`, `Triggering PRD`, `Sibling`, `Commit`) are non-sensitive
  metadata; the `Commit` hash is public.

## 9. Test Plan

| # | Test | Type | Description | Path |
|---|------|------|-------------|------|
| 1 | Override immunity present | conformance | `hard-rules.md` contains the "Override immunity" preamble between the intro line and rule 1, asserting invariants are not waived by later context. | `tests/sdd-2026/override_immunity_test.md` |
| 2 | Hard rule 13 verbatim | conformance | `hard-rules.md` has a `^13\. ` line containing "not a code-regeneration source" and "spec-as-source". | `tests/sdd-2026/hard_rules_13_test.md` |
| 3 | Caption sync | conformance | The `N invariants` caption in `CLAUDE.md`, `README.md`, `README.es.md`, **and `docs/faq.md`** equals the highest enumerated rule number in `hard-rules.md` (currently 13); `docs/faq.md`'s prior stale "11" is corrected. | `tests/sdd-2026/caption_sync_test.md` |
| 4 | Rule-12 guard revised | conformance | `tests/roadmap/hard_rules_12_test.md` still asserts rule 12 verbatim, but its count guard is caption-sync, not hard-coded "no 13". | `tests/roadmap/hard_rules_12_test.md` |
| 5 | Size-floor decision row | conformance | `prd-authoring.md` decision table contains the small-observable-change row routing to `SYSTEM_ARTIFACT.md` + commit rationale with an escalation clause. | `tests/sdd-2026/decision_table_size_floor_test.md` |
| 6 | AgDR decision row + naming | conformance | `prd-authoring.md` has the AgDR decision-table row, the "Optional artifact" section, and the `AgDR-NNN` naming row; `CONVENTIONS.md` § 2 has the AgDR subsection. | `tests/sdd-2026/agdr_contract_test.md` |
| 7 | AgDR template shape | conformance | `templates/agdr.md` exists with the six header fields and five sections named in § 5. | `tests/sdd-2026/agdr_template_test.md` |
| 8 | § 2 Goals optional note | conformance | `prd-authoring.md` § 2 and `templates/prd.md` § 2 carry the optional event/condition phrasing note, marked as a suggestion (not a requirement). | `tests/sdd-2026/goals_phrasing_note_test.md` |
| 9 | AgDR does not gate | conformance | `workflow.md` step 9 states an emitted AgDR is referenced in the gate-block comment and does not gate promotion; `gate-block.md` is unchanged (AgDR is not a gate field). | `tests/sdd-2026/agdr_non_gating_test.md` |
| 10 | CLAUDE.md size preserved | conformance | After edits, `CLAUDE.md` stays *strictly under* the `framework-maintenance.md` line target ("under 50 lines" → `< 50`; read the target from the rule file, do not hardcode). No rule content was added to `CLAUDE.md`. | `tests/sdd-2026/claude_md_size_test.md` |
| 11 | Frozen documents untouched | conformance | The implementation commit's `git diff` shows no edits to existing frozen PRDs/ADRs (`001-product-roadmap.md`, `ADR-001-*.md`) or team data (`SIBLINGS.md`). Only `tests/roadmap/hard_rules_12_test.md` (a living test artifact) changes among pre-existing files. | `tests/sdd-2026/frozen_docs_untouched_test.md` |

## 10. Migration Plan

- **Rollout order.** All changes are additive edits to framework files plus one
  new template and new test files; they can land in a single commit. No deploy
  sequence, no datastore, no feature flag.
- **Caption sync is atomic with rule 13.** The `hard-rules.md` rule-13 edit and
  the three canonical caption edits (`CLAUDE.md`, `README.md`, `README.es.md`)
  plus the revised `hard_rules_12_test.md` land together, so no commit ever has a
  caption/count mismatch. The `docs/faq.md` caption is a *separate* fix of a
  pre-existing drift (it read a stale "11"); it is corrected in the same commit
  but is not part of the rule-13 atomic block.
- **Backfill.** None. AgDR is opt-in and not retroactive. Existing PRDs are
  unaffected; the § 2 Goals note is optional and changes no existing PRD.
- **Rollback.** Revert the commit. Removing hard rule 13 requires reverting the
  three canonical captions (and the `docs/faq.md` drift fix) and restoring
  `hard_rules_12_test.md`'s hard-coded-12 guard in the same revert. No team data
  (`SIBLINGS.md`, PRDs, ADRs) is touched.
- **Upgrade propagation.** `scripts/upgrade.sh` copies `templates/` and
  `.claude/rules/` by directory glob, so `templates/agdr.md` and the rule edits
  reach adopters with no script change.

## 11. Open Questions

- [ ] Should an AgDR worked example be added under `examples/` before promotion,
      or is the template sufficient? (Deferred — does not block the gate.)
- [ ] Should `docs/concepts/mental-model.md` mention AgDR as an optional
      artifact, or stay at "four document types"? (Leaning: stay at four; AgDR
      is an artifact, not a core document type. Deferred.)

---

## Gate: Promotion to `Implemented`

```yaml
commit_hash: [TBD]
tests:
  - [TBD]
system_artifact_diff: []   # terminal value: the only impacted sibling (specforge)
                           # maintains no SYSTEM_ARTIFACT.md, so the list is
                           # empty by the gate-block rule (length = # of impacted
                           # siblings with a SYSTEM_ARTIFACT.md = 0). Empty list is
                           # a permitted Draft form per CONVENTIONS.md § 3; matches
                           # PRD-001's precedent.
```
