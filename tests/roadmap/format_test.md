# Test #1: ROADMAP.md format grep-parseability

**Type**: conformance
**PRD reference**: [PRD-001 §9 row #1](../../001-product-roadmap.md#9-test-plan)

## What this verifies

The regex anchors declared in PRD §6.1 (item header, theme header, field line, evidence list start) are the contract that tooling and the lead agent rely on to parse `ROADMAP.md` without a separate manifest. A failure here means any grep-based consumer silently drops items or misattributes fields.

## Fixtures

Populate `templates/roadmap.md` (or an equivalent fixture) with:

- File-level header containing `**Last rotated**: 2026-04-19`, `**Stale threshold**: 6 months`, `**Visibility**: public`.
- One theme section at `### ROADMAP-T-001: sample-theme` with fields `**Status**`, `**Rationale**`, `**Items**`.
- One item section at `### ROADMAP-001: sample-item` with all required fields from §5.2 and an `**Evidence**:` list start followed by one bullet.

## Steps

1. Run regex `^### ROADMAP-(\d{3}): ` against the fixture and record all matches (line numbers + captured group).
2. Run regex `^### ROADMAP-T-(\d{3}): ` against the fixture and record all matches.
3. Run regex `^\*\*(?P<field>[^*]+)\*\*: (?P<value>.*)$` against the fixture and record every field/value pair.
4. Run regex `^\*\*Evidence\*\*:$` against the fixture and record all matches.

## Pass criteria

- [ ] Regex `^### ROADMAP-(\d{3}): ` matches exactly one line in the fixture; the captured group is `001`.
- [ ] Regex `^### ROADMAP-T-(\d{3}): ` matches exactly one line in the fixture; the captured group is `001`.
- [ ] Regex `^\*\*(?P<field>[^*]+)\*\*: (?P<value>.*)$` matches every `**Field**: value` line in the theme and item sections, including `Status`, `Horizon`, `Theme`, `Last reviewed`, `Problem / outcome`, `User`, `Siblings likely impacted`.
- [ ] Regex `^\*\*Evidence\*\*:$` matches exactly one line in the fixture (the Evidence list anchor for the item).
- [ ] No regex matches a `###` heading that is not an item or theme (e.g. `## Stale items` is not captured by either item or theme anchor).

## Fail examples

- The item heading is written as `### ROADMAP-1: …` (no zero-padding) — anchor `^### ROADMAP-(\d{3}): ` misses it.
- The Evidence anchor is written as `**Evidence:**` (colon inside the bold span) — anchor `^\*\*Evidence\*\*:$` misses the line.
