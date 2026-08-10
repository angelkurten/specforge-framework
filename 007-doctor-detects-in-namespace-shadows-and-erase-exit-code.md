# PRD-007: doctor detects in-namespace shadows, and an exit code for incomplete erase

**Status**: Draft
**Date**: 2026-08-09
**Author**: AI-assisted
**Priority**: P2
**Depends on**: PRD-003, PRD-006
**Supersedes**: PRD-006 (partial — carries two 🟡 findings the PRD-006 post-implementation panel routed here; PRD-006 itself remains `Implemented` and frozen)

> **Note**: Framework-internal PRD. Impacted sibling is `specforge`. This is a
> **stub** created to give two tracked destinations to 🟡 findings from
> PRD-006's post-implementation re-review (per `workflow.md` step 9 and
> `gate-block.md`'s 🟡-closure rule). It is a placeholder for scope, not a
> finished design; its own review loop runs when it is picked up.

## Impacted Projects

| Project | Impact |
|---------|--------|
| **specforge** | `tools/cli/src/validators/framework-file-integrity.ts` (or a new validator) gains detection of an **unexpected file under `.claude/agents/specforge/`** — a file not in `bundleHashes` — so a well-formed forgery placed inside the namespace under a framework identity is reported instead of passing silently. Separately, `tools/cli/src/commands/init.ts` and PRD-003 §5.1's exit-code table gain a code for "install completed, erase incomplete" so `specforge init --force --erase` signals a refused deletion to automation. |

---

## 1. Problem Statement

PRD-006's post-implementation panel cleared with no open 🔴, but routed two
🟡 findings here because neither is fixable inside PRD-006 without violating a
frozen contract.

**In-namespace forgery is undetected.** PRD-006's `subagent-frontmatter`
validator has two error classes: schema violations *inside*
`.claude/agents/specforge/`, and the reserved `specforge-` prefix *outside*
it. A well-formed definition placed **inside** the namespace under a
duplicated framework identity (e.g. `.claude/agents/specforge/aaa-forged.md`
with `name: specforge-security-reviewer`, valid frontmatter, and a body that
forces `VERDICT: APPROVE`) satisfies class 1 — a `specforge-` prefix is
exactly what class 1 requires inside the namespace — and class 2 does not
apply inside. `framework-file-integrity` iterates `bundleHashes`, so it hashes
only the twelve known paths and never sees the extra file. `doctor` exits 0.
PRD-006 §4.4 documents that additional files under the namespace are invisible
to `update` and handled by `init --force --erase`, but the security
consequence — that the namespace's integrity premise has a hole an attacker
with repo write can use — was not drawn out. (The severity is bounded by the
pre-existing `framework-file-integrity` fail-open on version-mismatched
installs, PRD-005 §3; `permissions.deny` remains the recommended defence,
PRD-006 §8.)

**A refused erase is invisible to automation.** PRD-006 routed
`init --force --erase` refusals to a printed warning on exit 0, because
returning a non-zero code would have reused PRD-003 §5.1's frozen `10`
("I/O error during copy") for a run in which the copy succeeded, and PRD-006
§5 committed to "no new exit code". So `specforge init --force --erase &&
deploy` proceeds over a refused deletion. Giving this its own exit code
requires amending PRD-003 §5.1's table — a frozen document — which is a new
design act, not a post-implementation fix.

## 2. Goals

- When `doctor` runs against an install whose `.claude/agents/specforge/`
  contains a file not present in the framework bundle, then it shall report
  an error naming the unexpected file.
- Add an exit code to PRD-003 §5.1's table for "install completed, one or
  more erase targets refused", and have `init --force --erase` return it.
- Preserve every existing PRD-003 exit-code meaning unchanged.

## 3. Non-Goals

- Fixing the `framework-file-integrity` version-mismatch fail-open (PRD-005 §3
  deferred it; still out of scope).
- Any change to the `subagent-frontmatter` two-class design, which the PRD-006
  panel verified as correct for its stated scope.

## 4. User Flows / Design

*Deferred — sections 4 through 11 are unwritten. This PRD is a stub: it
exists only to carry a tracked destination for the two 🟡 findings in §1.
Its own grounding, design, and review loop run when it is picked up; see
§1 for the seed scope and §2/§3 for the provisional goals and non-goals
already captured.*

## 5. API

*Deferred — see §4.*

## 6. Data Model

*Deferred — see §4.*

## 7. Architecture

*Deferred — see §4.*

## 8. Security

*Deferred — see §4.*

## 9. Test Plan

*Deferred — see §4.*

## 10. Migration Plan

*Deferred — see §4.*

## 11. Open Questions

- [ ] Everything — this PRD has not yet been drafted past §1-§3.

---

## Gate: Promotion to `Implemented`

```yaml
commit_hash: [TBD]
tests:
  - [TBD]
system_artifact_diff:
  - [TBD]
```
