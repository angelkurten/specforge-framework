# Test #10: Visibility field strictness

**Type**: conformance
**PRD reference**: [PRD-001 §9 row #10](../../001-product-roadmap.md#9-test-plan)

## What this verifies

The `Visibility` field (§5.1) modulates PII-pattern severity: `public` (and absence) → 🔴 on email/phone; `private` → 🟡. This test isolates the severity-modulation behaviour of the visibility field using a single fixture to avoid other variables confounding the check.

## Fixtures

One category-4 quote carrying an email pattern:

```markdown
**Evidence**:
- 'please add bulk export' — jane.doe@example.com, 2026-03-18
```

Three variants of the file-level `Visibility` header:

A. Header line `**Visibility**: public`.
B. Header line `**Visibility**: private`.
C. No `**Visibility**:` header line at all (absent).

## Steps

1. Dispatch the evidence critic briefing three times — once per variant — with the same evidence fixture.
2. Record severity of the email-pattern finding per variant.

## Pass criteria

- [ ] Variant A (`Visibility: public`) produces a 🔴 finding on the email pattern.
- [ ] Variant B (`Visibility: private`) produces a 🟡 finding on the email pattern.
- [ ] Variant C (Visibility absent) produces a 🔴 finding on the email pattern — default is `public` per §5.1.
- [ ] The 🔴 findings (variants A and C) carry identical severity and identical citation of the §5.5 email-regex row.
- [ ] None of the three variants accepts the fixture silently — every variant emits a finding at some severity.

## Fail examples

- Variant B produces 🔴 — private visibility must downgrade email patterns to 🟡.
- Variant C produces 🟡 because absence is treated as "unspecified" — §5.1 states absence defaults to `public`.
