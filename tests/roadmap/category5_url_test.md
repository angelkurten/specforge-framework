# Test #7: Category-5 URL credential detection

**Type**: conformance
**PRD reference**: [PRD-001 §9 row #7](../../001-product-roadmap.md#9-test-plan)

## What this verifies

Category-5 (competitor) URLs must be rejected by the evidence critic when they carry credential-like query parameters or point to an internal-domain allowlist entry. The PRD prescribes 🔴 for all three fixtures, independent of `Visibility`. A failure here means credentials or internal share links land in `ROADMAP.md`.

## Fixtures

Assume an internal-domain allowlist containing `notion.internal.example.com`. Three candidate items, all with `Visibility: public`:

1. URL with credential-like token:
   ```markdown
   **Evidence**:
   - https://competitor.example.com/feature?token=abc123 captured 2026-04-01
   ```
2. URL with signature parameter:
   ```markdown
   **Evidence**:
   - https://competitor.example.com/feature?sig=xyz789 captured 2026-04-01
   ```
3. URL on internal-domain allowlist:
   ```markdown
   **Evidence**:
   - https://notion.internal.example.com/share/page captured 2026-04-01
   ```

Additionally, exercise `Visibility: private` against fixture 1 to confirm credential detection does not downgrade with visibility.

## Steps

1. Dispatch the evidence critic briefing with all 3 candidates as `{{CANDIDATE_ITEMS}}`, `Visibility: public`.
2. Dispatch the evidence critic briefing with fixture 1 modified to `Visibility: private`.
3. Record severity per fixture.

## Pass criteria

- [ ] Fixture 1 (`?token=`) under `public` → 🔴, finding cites "Credentials in URL" row of §5.5 syntactic table.
- [ ] Fixture 2 (`?sig=`) under `public` → 🔴, finding cites "Credentials in URL" row.
- [ ] Fixture 3 (internal-domain allowlist) under `public` → 🔴, finding cites "Internal share-link leak" row.
- [ ] Fixture 1 under `Visibility: private` → still 🔴 (credential detection does not modulate with visibility, unlike email/phone).
- [ ] None of the three fixtures is accepted without remediation.

## Fail examples

- Fixture 3 returns 🟡 because the URL scheme looks ordinary — internal-domain allowlist match is 🔴.
- Fixture 1 under `private` is downgraded to 🟡 — credential detection is not visibility-modulated.
