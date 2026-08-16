# PRD-013: A propagation surface that survives line drift

**Status**: Draft
**Date**: 2026-08-16
**Author**: AI-assisted
**Priority**: P3
**Depends on**: PRD-012
**Supersedes**: PRD-012 (partial — §6.2's propagation table, its
"exhaustive" claim, and the count restatements at `:37`, `:96`, `:419-420`,
`:627`, `:653` and `:671` that depend on it. The rest of PRD-012 stands
frozen and correct; its shipped code is correct and was verified so by all
three post-implementation reviewers.)

> **Note**: This is a **framework-internal PRD** — specforge applying its own
> process to change itself. The impacted sibling is `specforge` (see
> [`SIBLINGS.md`](SIBLINGS.md)). Framework-maintenance rules apply (see
> [`.claude/rules/framework-maintenance.md`](.claude/rules/framework-maintenance.md)).
>
> **This is a stub.** It exists as the tracked artifact for PRD-012's
> post-implementation finding B-C, per `gate-block.md`'s 🟡-closure
> destination 2. Sections 2 through 11 carry the shape the corpus requires
> and enough content to brief a later author; none has been through a
> reviewer panel. Ground and draft properly before implementing.

## Impacted Projects

| Project | Impact |
|---------|--------|
| **specforge** | Changes how a PRD enumerates the files and sites a change propagates to. Today `prd-authoring.md` prescribes no shape for that enumeration and PRD-012 §6.2 invented one — a table with a `Line` column pinning absolute line numbers, plus an "exhaustive" claim and six count restatements elsewhere in the document. The table drifted four times against a single change while the tree beneath it moved, twice because the PRD's own edits renumbered the files it cited. Likely surface: a convention in `CONVENTIONS.md` or `prd-authoring.md` for anchoring propagation sites by stable identifier rather than line number, and a rule about where completeness may and may not be claimed. No CLI or validator change is anticipated; `doctor` reads no PRD body today and this PRD does not propose that it start. |

---

## 1. Problem Statement

PRD-012 §6.2 is a propagation table: one row per file and site a change
touches, with a `Line` column of absolute line numbers, under the heading
**"This table is exhaustive."** It was wrong about its own completeness four
times against one change — a first draft missed seven sites, the
post-implementation panel found three files with no row plus one listed only
as no-change that changed, and two fix rounds added line-level sites beyond
the rows then present.

Two amendment attempts to fix it were both refuted by an adversarial bounce.
The second refutation's diagnosis is this PRD's problem statement, quoted
because it is the finding: *"What fails is not judgement, it is the
mechanism. §6.2 pins line numbers into a `Draft` document while the tree
under it moves."* Concretely, the second attempt cited six `workflow.md`
lines past the end of that file as it stood at the PRD's own base commit,
because they were post-change numbers in a table whose convention is
pre-change; and PRD-012's edit to `gate-fence.ts` pushed `GATE_FENCE_RE`
down three lines, invalidating two of the PRD's own citations mid-flight.

The cost is not cosmetic. `workflow.md` step 6's propagation pass exists to
catch exactly the `count` and `identifier` fact classes this table is made
of, and PRD-012 §6.2 states that an implementer trusts the claim *instead of
looking*. A propagation surface that cannot stay true is worse than one that
does not claim to be complete.

## 2. Goals

1. Define, once, how a PRD anchors a propagation site so the anchor survives
   edits to the file it names.
2. If a PRD claims a propagation enumeration is complete, then the claim
   shall be scoped to a stated commit, and the document shall restate that
   scope nowhere else.
3. Correct PRD-012 §6.2 and its six dependent count restatements, closing
   finding B-C.
4. Keep the enumeration a table — the fact classes it carries are exactly
   what the propagation pass reads.

## 3. Non-Goals

- **No `doctor` validator over PRD bodies.** PRD-012 §5.4 established that no
  validator reads the body of a rule or PRD file, and adding one to check
  line anchors would be a far larger change than the defect warrants.
- **No retroactive correction of other PRDs.** PRD-001 through PRD-011 carry
  `file:line` citations throughout and are frozen. This PRD changes the
  convention going forward.
- **Not a general citation-format change.** Prose `file:line` citations are
  fine and are how the corpus reads; the defect is specific to a *table that
  claims completeness* and is used as a work list.

## 4. User Flows

The actor is a PRD author enumerating a propagation surface, and the
implementer who later works from that enumeration. Flows to be drawn at
drafting time; the shape is: author anchors a site → implementer resolves the
anchor against the current tree → a site the anchor no longer resolves to is
a finding rather than a silent miss.

## 5. API

No CLI command, flag, exit code, `doctor` finding, or dispatch-brief field is
expected to change. The interface surface is a documentation convention in
`CONVENTIONS.md` or `prd-authoring.md`. To be specified at drafting time.

## 6. Data Model

No persisted schema, manifest, or bundle entity changes. The structured data
at issue is the propagation table's own column set — today `File(s)`, `Line`,
`Current`, `Change` — and whether `Line` should hold an absolute number, a
stable anchor (a heading, a quoted token, a section reference), or both.

## 7. Architecture

No component or dispatch edge changes. This is a convention that governs how
one document section is written.

## 8. Security

No trust boundary moves. One indirect consideration to carry into drafting:
PRD-012's second amendment attempt was refuted partly because a sentence
addressed to an implementer lands as a live directive — `PRD_PATH` is a
sanctioned instruction file for the two implementer roles. Any convention
this PRD adds about how an implementer treats a stale anchor is instruction
surface for an agent holding `Edit`/`Write`/`Bash` and must be written as
such.

## 9. Test Plan

| # | Test | Type | Description | Path |
|---|------|------|-------------|------|
| 1 | the convention is stated once | conformance | whichever file carries it states the anchoring rule, and no other framework file restates it | `tools/cli/tests/conformance/framework.test.ts` |
| 2 | PRD-012 §6.2's claim is scoped | conformance | §6.2 no longer claims unqualified exhaustiveness, and the six dependent count restatements agree with the table | `tools/cli/tests/conformance/framework.test.ts` |

Rows to be expanded at drafting time; these two are the floor closing B-C.

## 10. Migration Plan

**Version**: next minor release after this PRD is gated. No version reserved
at `Draft` time.

**Order**: state the convention; correct PRD-012 §6.2 and its six dependent
sites in one edit, since partial propagation is what refuted both prior
attempts; add the conformance rows; run the full CLI suite.

**Rollback**: revert the commit. The change is prose in framework files that
`update` overwrites from the bundle, and adds no file.

**Note on editing PRD-012**: it will be `Implemented` and frozen when this
PRD ships. `Supersedes:` is the route, per hard rule 7 — this PRD does not
edit PRD-012 in place.

## 11. Open Questions

- [ ] **Is the anchor a heading, a quoted token, or a section reference?** A
      quoted token is greppable and survives renumbering but breaks when the
      quoted text is what changes — which is the common case for a
      propagation table.
- [ ] **Should a propagation table claim completeness at all?** PRD-012's
      second refutation argued that declaring the set open "describes less
      than what was intended". The alternative is a claim scoped to a commit,
      which is what goal 2 assumes without having tested it against a
      reviewer.
- [ ] **Does this generalise past `§6.2`-shaped tables?** `prd-authoring.md`
      prescribes no propagation section at all today; PRD-012 invented one.
      Deciding whether it becomes a required section is prior to deciding its
      column shape.

---

## Gate: Promotion to `Implemented`

```yaml
commit_hash: [TBD]
tests:
  - [TBD]
system_artifact_diff:
  - [TBD]
```
