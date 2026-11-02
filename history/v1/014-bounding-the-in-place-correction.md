# PRD-014: Bound the in-place correction route, and give it a review surface

**Status**: Draft
**Date**: 2026-08-16
**Author**: AI-assisted
**Priority**: P2
**Depends on**: PRD-013
**Supersedes**: PRD-013 (partial — §9 row 3's Description, which
under-enumerates the assertions that landed under it, and §8's
no-novel-content argument, which covers one of the three `Site` forms.
Neither is a defect in what PRD-013 shipped; both are places the document
describes less than the code does.)

> **Note**: This is a **framework-internal PRD** — specforge applying its own
> process to change itself. The impacted sibling is `specforge` (see
> [`SIBLINGS.md`](SIBLINGS.md)). Framework-maintenance rules apply (see
> [`.claude/rules/framework-maintenance.md`](.claude/rules/framework-maintenance.md)).
>
> **This is a stub.** It exists as the tracked artifact for PRD-013's
> post-implementation findings, per `gate-block.md`'s 🟡-closure destination
> 2. Sections 2 through 11 carry the shape the corpus requires and enough
> content to brief a later author; none has been through a reviewer panel.
> Ground and draft properly before implementing.
>
> **It is in scope for its own rule.** PRD-014 proposes a boundary on
> editing frozen PRDs, and the first document that boundary will govern is
> PRD-012, which PRD-013 already edited seven times.

## Impacted Projects

| Project | Impact |
|---------|--------|
| **specforge** | Bounds what an in-place factual correction to an `Implemented` PRD may touch, and gives such an edit a review surface it does not have today. Likely surface: a clause on `prd-authoring.md`'s decision-table row and/or hard rule 7 stating that the gate fence and its contents are out of reach; a bullet in the four reviewer definitions' post-implementation section obliging a record-integrity read when a frozen PRD appears in `CODE_REFERENCES`; and a sentence in `CONVENTIONS.md` admitting the correction-note shape the corpus now carries. No CLI change is anticipated, though a `doctor` check over the gate region is the obvious mechanisation once the boundary is stated. |

---

## 1. Problem Statement

PRD-013 corrected `012-validation-phase-and-prd-amendment.md` in place —
seven edits across four commits — under hard rule 7's clause permitting an
edit `except to correct factual errors`, routed by `prd-authoring.md`'s
decision table to `Edit in place`. The corrections were right and the
security panel verified the gate region byte-identical across the whole
range. But that panel found two gaps, and the second was demonstrated three
times while the first was being routed.

**The route states no boundary.** The decision-table row says to note the
correction at the top and not to bump status. That constrains one field.
Nothing constrains `commit_hash`, the `tests:` list, `system_artifact_diff`,
or the `# yellow-tracking:` comment — and PRD-013 established that a
"factual correction of this kind" can mean rewriting a 39-row table, a
section opening and an `Impacted Projects` cell. The exposure is not
external: it is a future lead with a plausible correction and a route that
says nothing about where to stop. A silently re-pointed `commit_hash` severs
an `Implemented` PRD from the code it certifies, which is the one property
the gate block exists to carry.

**And the route has no mandatory review.** No validator holds a baseline for
a PRD's prior content: `framework-file-integrity` covers bundle paths only,
and `prd-back-refs` matches a different literal. That leaves the
post-implementation panel — whose definitions carry no clause obliging a
reviewer to treat a frozen PRD in `CODE_REFERENCES` as a record-integrity
check rather than as ordinary diff surface. PRD-013's panel performed one
because the lead asked for it in prose, three rounds running. A lead who
omits that paragraph gets a panel that reads the edit as ordinary, and step
9's diff-reconcile passes it clean because the file *is* in the ledger.

Two smaller findings ride along, both places PRD-013's document describes
less than its code does. Its §9 row 3 enumerates four clauses and five
assertions landed under it. Its §8 argues a `Site` cell carries no novel
content because a span must pre-exist in the named file — true of the span
form, and not reaching the named-structural-unit form, which is
author-supplied prose constrained to pre-exist nowhere. The conclusion
survives on a broader argument the section does not make: the PRD is a
sanctioned instruction file end to end, so anyone who can write a `Site`
cell can write §5 prose, and the marginal surface is zero.

## 2. Goals

1. State what an in-place factual correction to an `Implemented` PRD may not
   touch, in the same place the route is defined.
2. When a PRD carrying `Status: Implemented` appears in a post-implementation
   panel's `CODE_REFERENCES`, the reviewer definitions shall oblige a
   record-integrity read without the lead having to ask for it in prose.
3. Admit the correction-note shape the corpus now carries, which
   `CONVENTIONS.md` does not describe.
4. Correct PRD-013 §9 row 3's Description and §8's construction argument.

## 3. Non-Goals

- **No change to whether an in-place correction is permitted.** Hard rule 7
  already allows it and PRD-013 exercised it correctly. This PRD bounds the
  reach, not the permission.
- **No `doctor` validator in this PRD.** A check over the gate region is the
  obvious mechanisation and is deliberately deferred: PRD-013's first draft
  was blocked for specifying a validator before the rule it would enforce
  existed, and the same order applies here. §11 carries it.
- **No retroactive audit of PRDs 001-012.** Only PRD-012 has been corrected
  in place; the boundary applies from here.

## 4. User Flows

The actor is a lead correcting a factual error in a frozen PRD, and the
reviewer panel that reads the result. Flows to be drawn at drafting time. The
shape: the lead identifies a factual error → checks it against the boundary →
edits, with a dated note naming the correcting PRD → the panel reads the
frozen PRD as a record-integrity check without being asked.

## 5. API

No CLI command, flag, exit code or dispatch-brief field is expected to
change. The interface surface is a clause on the decision-table row, a bullet
in four subagent definitions, and a sentence in `CONVENTIONS.md`. To be
specified at drafting time.

## 6. Data Model

No persisted schema changes. The structured data at issue is the gate block's
region — the `## Gate:` heading, the YAML fence, its three required fields
and its comment lines — and whether the boundary names it structurally or
enumerates its fields.

### 6.1 Sites known at authoring time

Anchored per PRD-013 §5.1. Not a completeness claim; step 9's diff-reconcile
establishes what this misses.

| File(s) | Site | Current | Change |
|---|---|---|---|
| `.claude/rules/prd-authoring.md` | the span `Edit in place` | the decision table's factual-correction row | Gains the boundary clause |
| `.claude/rules/hard-rules.md` | the span `except to correct factual errors` | rule 7's exception | Gains or cross-references the same boundary |
| `CONVENTIONS.md` | the span `Every PRD begins with an H1 title` | § 3's header-shape statement | Admits a correction note between the H1 and the metadata block |
| `.claude/agents/specforge/specforge-backend-reviewer.md` | the span `does the shipped code honor` | the post-implementation mode section | Gains the record-integrity bullet |
| `.claude/agents/specforge/specforge-frontend-reviewer.md` | the post-implementation mode section | same text | same bullet |
| `.claude/agents/specforge/specforge-security-reviewer.md` | the post-implementation mode section | same text | same bullet |
| `.claude/agents/specforge/specforge-quality-reviewer.md` | the post-implementation mode section | same text | same bullet |
| `013-propagation-table-line-drift.md` | §9 row 3's Description | four enumerated clauses | Gains the fifth, the `Impacted Projects` assertion that landed under it |
| `013-propagation-table-line-drift.md` | §8's construction argument | scoped to the span form | Widened, or the broader sanctioned-instruction-file argument substituted |

## 7. Architecture

No component or dispatch edge changes. Prose in rule files, four subagent
definitions and one conventions file.

## 8. Security

This PRD is a security change: both driving findings came from the security
panel, and goal 1 protects the integrity of the promotion record.

The threat is a future lead, not an external actor. An in-place correction is
performed by the one role with no capability constraint on writing an
`NNN-*.md` — the implementer definitions forbid it, which is why PRD-013's
implementer declined and the lead performed the edits. That routing is
correct and this PRD does not change it; what it adds is a stated limit on
what the lead may reach while there.

Second-order: the record-integrity bullet in goal 2 is instruction text in a
subagent definition, not a gate. A reviewer that ignores it fails silently,
the same residual every instruction-level control in this framework carries.
The `doctor` check §11 defers is what would close it.

## 9. Test Plan

| # | Test | Type | Description | Path |
|---|------|------|-------------|------|
| 1 | the boundary is stated once | conformance | `prd-authoring.md`'s decision-table row states what an in-place correction may not touch; `hard-rules.md` rule 7 carries or cross-references it; no third file restates it | `tools/cli/tests/conformance/framework.test.ts` |
| 2 | the record-integrity bullet lands in all four reviewers | conformance | each of the four definitions' post-implementation section obliges the check when a `Status: Implemented` PRD appears in `CODE_REFERENCES` | `tools/cli/tests/conformance/framework.test.ts` |
| 3 | PRD-013's two corrections landed | conformance | §9 row 3's Description names the `Impacted Projects` assertion; §8's argument reaches all three `Site` forms | `tools/cli/tests/conformance/framework.test.ts` |

Rows to be expanded at drafting time; these three are the floor.

## 10. Migration Plan

**Version**: next minor release after this PRD is gated.

**Order**: state the boundary in `prd-authoring.md` and `hard-rules.md`; add
the bullet to the four reviewer definitions; add the `CONVENTIONS.md`
sentence; correct PRD-013's two sites; add the §9 assertions; run the full
CLI suite and `doctor`.

**PRD-013 will be `Implemented` and frozen when this ships**, so its two
corrections go through the route this PRD is bounding — which is the
recursion the header note names, and worth stating in the commit rather than
discovering.

**Rollback**: revert the commit and publish a patch. Prose in framework
files, which `update` overwrites from the bundle. No state.

## 11. Open Questions

- [ ] **Does the boundary name the gate region structurally or enumerate its
      fields?** Naming the region (`the ## Gate: heading, its fence and its
      contents`) survives a future field being added; enumerating
      (`commit_hash`, `tests`, `system_artifact_diff`) is checkable today by
      a validator that does not exist yet.
- [ ] **Should a `doctor` check enforce it?** §3 defers this deliberately.
      The check would need a baseline for a PRD's prior content, which no
      validator holds today — the likely shape is a git-aware check, which
      no validator is.
- [ ] **Does the record-integrity bullet belong in the reviewer definitions
      or in `workflow.md` step 9?** The definitions reach the reviewer
      directly; step 9 reaches the lead who writes the brief. PRD-012 faced
      the same choice for the injection gate and put it in both.

---

## Gate: Promotion to `Implemented`

```yaml
commit_hash: [TBD]
tests:
  - [TBD]
system_artifact_diff:
  - [TBD]
```
