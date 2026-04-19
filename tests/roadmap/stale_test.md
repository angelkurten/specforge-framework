# Test #21: Stale items section — default threshold

**Type**: conformance
**PRD reference**: [PRD-001 §9 row #21](../../001-product-roadmap.md#9-test-plan)

## What this verifies

§5.1 specifies that the `## Stale items` section lists items whose `last_reviewed` is older than the file-level `Stale threshold`. With a 6-month threshold, items reviewed 7 and 12 months ago must appear; items reviewed 5 months ago must not. A failure here means stale drift signals go unsurfaced.

## Fixtures

Assume the test is executed on 2026-04-19.

`ROADMAP.md` header:

```markdown
**Last rotated**: 2026-04-19
**Stale threshold**: 6 months
```

Three items with these `Last reviewed` dates:

- `ROADMAP-001: item-seven-months-old` → `Last reviewed: 2025-09-19` (7 months ago)
- `ROADMAP-002: item-five-months-old` → `Last reviewed: 2025-11-19` (5 months ago)
- `ROADMAP-003: item-twelve-months-old` → `Last reviewed: 2025-04-19` (12 months ago)

Each item has whatever additional required fields are needed to validate; status does not affect stale computation.

## Steps

1. Run the stale-items computation pass (per §5.1 `## Stale items` comment).
2. Read the generated `## Stale items` section.

## Pass criteria

- [ ] `## Stale items` section lists exactly two bullet entries.
- [ ] One bullet references `ROADMAP-001` and cites `last reviewed 2025-09-19`.
- [ ] One bullet references `ROADMAP-003` and cites `last reviewed 2025-04-19`.
- [ ] No bullet references `ROADMAP-002` (5 months old is within threshold).
- [ ] Entries follow the exact format in §5.1: `- [ROADMAP-NNN] <title> — last reviewed YYYY-MM-DD`.

## Fail examples

- Section includes `ROADMAP-002` because the computation uses days (≤ vs <) incorrectly — 5 months is clearly under the 6-month threshold.
- Section omits `ROADMAP-003` because the computation caps at an arbitrary window (e.g. only "recently stale") — all items past threshold must list.
- The section format deviates (missing the `— last reviewed YYYY-MM-DD` suffix) — format is prescribed by §5.1.
