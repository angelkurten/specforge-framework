# Test #5: Forbidden evidence — syntactic PII patterns

**Type**: conformance
**PRD reference**: [PRD-001 §9 row #5](../../001-product-roadmap.md#9-test-plan)

## What this verifies

The syntactic forbidden-patterns table in §5.5 is the canonical PII/credential detection surface and must be enforced by the evidence critic with severity modulated by the `Visibility` field. A failure here means PII can land verbatim in `ROADMAP.md` and git history.

## Fixtures

Six candidate items, each with one category-4 or category-5 entry triggering exactly one pattern:

1. **Email in quote** (two variants — one item with `Visibility: public`, one with `Visibility: private`):
   ```markdown
   **Evidence**:
   - 'please add bulk export' — jane.doe@example.com, 2026-03-18
   ```
2. **Phone number** (two variants — `public` and `private`):
   ```markdown
   **Evidence**:
   - 'call me back' — user 555-123-4567, 2026-03-18
   ```
3. **`@handle` social-media handle in quote** (single variant, `Visibility: public`):
   ```markdown
   **Evidence**:
   - 'love the app @productteam' — external user, 2026-03-18
   ```
4. **Name heuristic in quote** (single variant, `Visibility: public`):
   ```markdown
   **Evidence**:
   - 'John Smith said the export flow breaks' — channel: support email, 2026-03-18
   ```
5. **Pasted content blob** (≥3 consecutive lines, `Visibility: public`):
   ```markdown
   **Evidence**:
   - user feedback dump:
     line one of pasted content
     line two of pasted content
     line three of pasted content
   ```
6. **Image markdown** in category-5 entry (`Visibility: public`):
   ```markdown
   **Evidence**:
   - ![competitor-feature](https://competitor.example.com/feature.png) captured 2026-04-01
   ```

## Steps

1. Dispatch the evidence critic briefing with all fixture variants (8 total: fixtures 1 and 2 have public+private variants; 3, 4, 5, 6 have only the listed variant).
2. Record severity (🔴 / 🟡) per fixture.

## Pass criteria

- [ ] Fixture 1 public variant → 🔴 (email regex, public visibility).
- [ ] Fixture 1 private variant → 🟡 (email regex, private visibility).
- [ ] Fixture 2 public variant → 🔴 (phone pattern, public visibility).
- [ ] Fixture 2 private variant → 🟡 (phone pattern, private visibility).
- [ ] Fixture 3 (`@handle`) → 🟡 regardless of visibility.
- [ ] Fixture 4 (name heuristic) → 🟡 regardless of visibility.
- [ ] Fixture 5 (pasted content blob ≥3 lines) → 🔴 regardless of visibility.
- [ ] Fixture 6 (image markdown in category-5) → 🔴 regardless of visibility.
- [ ] Every finding cites the specific row of the §5.5 syntactic table.

## Fail examples

- Fixture 1 private variant returns 🔴 instead of 🟡 — severity must downgrade under `Visibility: private`.
- Fixture 5 returns 🟡 because the critic treats it as a "verbose quote" — 3+ consecutive lines is 🔴 irrespective of visibility.
- Fixture 3 returns 🔴 — `@handle` is documented as 🟡, not 🔴.
