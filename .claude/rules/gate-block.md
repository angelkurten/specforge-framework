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
  - ../api-service/tests/auth/oauth_flow_test   # relative to specforge dir; any language
  - ../api-service/tests/auth/refresh_test
system_artifact_diff:
  - ../api-service/docs/SYSTEM_ARTIFACT.md#auth-oauth (commit a1b2c3d4)
```

## Rules

- **Both `tests` and `system_artifact_diff` are always YAML lists**, even when the list has only one entry. Never a bare scalar. This is absolute — single-shape fields are what lets tooling and grep treat the gate block as machine-readable.
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
