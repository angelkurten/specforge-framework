# Test #30: Gate-block path parity

**Type**: conformance
**PRD reference**: [PRD-001 §9 row #30](../../001-product-roadmap.md#9-test-plan)

## What this verifies

`gate-block.md` states the `tests:` list at promotion time is the deduplicated set of paths named in the PRD's §9 `Path` column. Drift between §9 and the gate block must be detected. A failure here means the gate block can silently diverge from the spec, defeating the provenance contract.

## Fixtures

Post-implementation state of `/Users/usuario/specforge/001-product-roadmap.md` after PRD-001 promotes to `Implemented`.

The file contains:

- §9 Test Plan table with a `Path` column (32 rows).
- Final gate block with a populated `tests:` YAML list.

## Steps

1. Read `001-product-roadmap.md`.
2. Extract every cell in the §9 table's `Path` column. Normalise by stripping leading/trailing whitespace. Deduplicate.
3. Parse the YAML `tests:` list at the bottom of the file under `## Gate: Promotion to Implemented`.
4. Compare the two sets character-for-character.

## Pass criteria

- [ ] The deduplicated §9 `Path` column yields exactly 32 paths (or fewer if duplicates exist — the deduplication is intentional per `gate-block.md`).
- [ ] The gate block's `tests:` YAML list has the same count as the deduplicated §9 Path set.
- [ ] Every path in the gate block `tests:` list appears in the §9 Path column (character-for-character, no fuzzy matching).
- [ ] Every path in the §9 Path column appears in the gate block `tests:` list (character-for-character, no fuzzy matching).
- [ ] The comparison is bidirectional: `(gate - §9) == ∅` and `(§9 - gate) == ∅`.
- [ ] Comparison is character-for-character (byte-exact), not tolerant to whitespace, path-separator, or extension differences.

## Fail examples

- `tests/roadmap/format_test.md` in §9 but `tests/roadmap/format-test.md` (hyphen instead of underscore) in the gate block — character mismatch, fail.
- A path appears twice in §9 but appears once in the gate block — acceptable only if §9 is deduplicated first; if the test counts §9 entries naïvely, it would over-report.
- The gate block includes `tests/roadmap/future_test.md` that does not appear in §9 — drift, fail.
