# Test #19: Dangling cross-references

**Type**: conformance
**PRD reference**: [PRD-001 §9 row #19](../../001-product-roadmap.md#9-test-plan)

## What this verifies

§5.2 and §5.4 require that a `theme` referenced by an item must exist, and every `item` listed on a theme must resolve. A failure here means `ROADMAP.md` can carry dangling cross-references that break the grep-parseable contract.

## Fixtures

Two fixture ROADMAP states, each isolated:

Fixture A — theme references a non-existent item:

```markdown
### ROADMAP-T-001: sample-theme
**Rationale**: strategic coherence placeholder.
**Items**: ROADMAP-999
```

No `ROADMAP-999` item exists in the file.

Fixture B — item references a non-existent theme:

```markdown
### ROADMAP-040: item-with-bad-theme
**Status**: Candidate
**Horizon**: Next
**Theme**: ROADMAP-T-999
**Last reviewed**: 2026-04-19
**Problem / outcome**: example.
**User**: admin
**Siblings likely impacted**: specforge

**Evidence**:
- SUPPORT-234
```

No `ROADMAP-T-999` theme exists in the file.

## Steps

1. Submit Fixture A to the cross-reference validator (lead agent or roadmap rule enforcement).
2. Submit Fixture B to the cross-reference validator.
3. Record validator responses per fixture.

## Pass criteria

- [ ] Fixture A → validation failure; error message names `ROADMAP-999` as an unresolved item reference from `ROADMAP-T-001`.
- [ ] Fixture B → validation failure; error message names `ROADMAP-T-999` as an unresolved theme reference from `ROADMAP-040`.
- [ ] Neither fixture is written or merged to `ROADMAP.md` in the failing state.
- [ ] The validator's failure is blocking (not advisory) — the roadmap must not persist with dangling refs.

## Fail examples

- Validator accepts Fixture A because the theme itself is well-formed — it must also verify item ids exist.
- Validator emits a 🟡 warning instead of blocking — dangling refs are a hard failure per §5.2 / §5.4.
