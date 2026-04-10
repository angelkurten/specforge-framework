---
name: specforge Implemented gate
description: The three-field YAML gate block that promotes a PRD from Draft to Implemented. Always loaded because drafting references these rules before the PRD file exists on disk.
---

# Gate block

Every PRD carries a YAML gate block at the very bottom of the file, under a heading `## Gate: Promotion to Implemented`. The block is present in `Draft` PRDs too — with `[TBD]` placeholders or empty YAML lists. **Never omit the block.**

## Canonical shape

```yaml
commit_hash: a1b2c3d4
tests:
  - ../api-service/tests/auth/oauth_flow_test.py   # relative to specforge dir; any language
  - ../api-service/tests/auth/refresh_test.py
system_artifact_diff:
  - ../api-service/docs/SYSTEM_ARTIFACT.md#auth-oauth (commit a1b2c3d4)
```

## Rules

- **Both `tests` and `system_artifact_diff` are always YAML lists**, even when the list has only one entry. Never a bare scalar. This is absolute — single-shape fields are what lets tooling and grep treat the gate block as machine-readable.
- **Post-implementation re-review is a precondition for filling this block.** Per `workflow.md` step 9, the gate block is populated **only after** the post-impl reviewer panel clears with no open 🔴 and every 🟡 routed to a tracked destination (fix-in-code / follow-up PRD / `SYSTEM_ARTIFACT.md` note). A populated gate block without a cleared re-review is a protocol violation.
- **🟡 closure requires a concrete artifact.** "Tracked" is not honor-system. Each 🟡 finding must point at one of:
  1. **Fix-in-code** — a code change **in the same merge commit range referenced by `commit_hash`** that addresses the finding (the quality reviewer verifies this in the post-impl re-review).
  2. **Follow-up PRD** — a **new PRD file** on disk with `Supersedes: PRD-N` in its header (a stub header is acceptable but the file must exist). Reference it by number in a comment above the gate block: `# yellow-tracking: PRD-N → follow-up PRD-M`.
  3. **`SYSTEM_ARTIFACT.md` note** — a **line in the impacted sibling's `SYSTEM_ARTIFACT.md`** that names the finding and cites the re-review round. The line must be present in the diff declared in `system_artifact_diff`.

  Before promoting to `Implemented`, verify every 🟡 finding from the post-impl re-review has exactly one of these three artifacts. Missing artifacts block promotion identically to a 🔴.
- **`tests` list provenance.** The `tests` list at gate-promotion time is the deduplicated set of paths named in the PRD's §9 Test Plan `Path` column (see `prd-authoring.md`). Paths in the gate block that are not in §9, or §9 paths missing from the gate block, indicate drift between spec and gate and fail gate validation.
- **A PRD cannot carry `Status: Implemented`** unless all three fields are present and non-empty. Any `[TBD]`, empty, or missing field keeps the PRD in `Draft`. No exceptions.
- **`tests` paths** are relative to the specforge directory and typically point into one of the sibling projects in `SIBLINGS.md`. Any language: `.py`, `.ts`, `.go`, `_test.go`, Rust modules — whatever the sibling uses.
- **`commit_hash`** is the merge commit where the feature landed on the main branch of the impacted sibling project. For multi-sibling PRDs shipped across separate commits, use the last merge commit that completes the feature.
- **Each entry in `system_artifact_diff`** is a relative path into one sibling's `SYSTEM_ARTIFACT.md` (with section anchor) plus the commit that updated it. **The list length equals the number of impacted siblings that maintain a `SYSTEM_ARTIFACT.md`** — UI-only siblings contribute zero entries. A PRD that impacts two siblings where only one has a `SYSTEM_ARTIFACT.md` has a 1-element list, not a 2-element list with a blank.
- **The gate block is the only location for these fields.** Do not duplicate them in the header. Tooling and grep rely on a single canonical shape.

## Draft state

In a `Draft` PRD the block looks like this:

```yaml
commit_hash: [TBD]
tests:
  - [TBD]
system_artifact_diff:
  - [TBD]
```

The `[TBD]` placeholders are filled when the code ships. Until then, the PRD stays `Draft`.
