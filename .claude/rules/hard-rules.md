---
name: specforge hard rules
description: Invariants that apply to every PRD and ADR authoring session. Always loaded.
---

# Hard rules

These are invariants, not preferences. Violating any of them fails review.

1. **Never invent** endpoints, tables, columns, functions, classes, env vars, or config keys. Verify each against real code, or mark it explicitly as **new** in the PRD.
2. **Never skip** the `Security`, `Test Plan`, or `Migration Plan` sections of a PRD.
3. **Diagrams are Mermaid only.** No ASCII art. Tables and nested bullet lists are not diagrams.
4. **No `> **Updated by PRD-X**` back-references.** The authoritative pointer lives in the *newer* PRD's `Depends on` / `Supersedes` header. To find newer PRDs that affect an older one, grep the older PRD's number across files with a newer number.
5. **One question at a time** in `AskUserQuestion`. Never batch questions inside a single tool call. For bounded decisions with 2-4 mutually exclusive options, use `AskUserQuestion`. For exploration or clarifications, ask in prose. If the user asks to answer in prose, comply immediately.
6. **`Implemented` requires the three-field gate.** See `gate-block.md`. Draft PRDs never carry populated gate fields.
7. **PRDs are frozen snapshots.** Do not edit a PRD marked `Implemented` except to correct factual errors or mark it `Superseded by PRD-N`. Design evolution happens in a new PRD. The single escape hatch — documented in `prd-authoring.md` and `workflow.md` step 9 option (ii) — is: if post-implementation re-review surfaces an unresolvable 🔴, move the PRD back to `Draft` and strip the gate fields. At that point the PRD is no longer `Implemented`, no longer frozen, and is free to be edited on its way to a later ship. The rule applies to the `Implemented` state, not to the file.
8. **Each impacted sibling's `SYSTEM_ARTIFACT.md` is updated on every ship that touches that sibling.** `SYSTEM_ARTIFACT.md` files are the only living documents in this framework — PRDs and ADRs are frozen. The `system_artifact_diff` gate field enforces this.
9. **No marketing language.** Forbidden: "blazingly fast", "enterprise-grade", "best-in-class", "robust", "seamless". Use concrete, measurable claims.
10. **Required sections in every PRD**: the `Impacted Projects` table in the header plus the numbered sections listed in `prd-authoring.md`. Omitting any fails review.
11. **Sibling registry discipline.** Every row in a PRD's `Impacted Projects` table must match, by name, a row in `SIBLINGS.md`. `Draft` PRDs may only cite rows with `Status: active`; historical PRDs (`Implemented`, `Superseded`) may cite retired rows too (the registry is append-only — see `SIBLINGS.md` § Rules). Adding, renaming, or retiring a sibling happens in the same commit as the PRD that triggers it.
