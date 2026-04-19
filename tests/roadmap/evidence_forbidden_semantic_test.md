# Test #4: Forbidden evidence — semantic patterns

**Type**: conformance
**PRD reference**: [PRD-001 §9 row #4](../../001-product-roadmap.md#9-test-plan)

## What this verifies

Three of the semantic forbidden patterns enumerated in §5.5 must each trigger a 🔴 finding from the evidence critic. A failure here means the critic is not detecting common anti-patterns and unflagged hypotheses or unsourced claims could land as evidence.

## Fixtures

Three candidate items, each with exactly one evidence entry:

1. **Unflagged hypothesis** (hypothesis without the `hypothesis:` prefix):
   ```markdown
   **Evidence**:
   - admins will adopt bulk actions once made discoverable
   ```
2. **"Users want X" sans source**:
   ```markdown
   **Evidence**:
   - users want a dark mode
   ```
3. **"Many ask for W" sans numbers or quotes**:
   ```markdown
   **Evidence**:
   - many people ask for CSV export
   ```

## Steps

1. Dispatch the evidence critic briefing with all 3 as `{{CANDIDATE_ITEMS}}`, `Visibility: public`.
2. Record findings per candidate, noting severity and which forbidden-semantic line in §5.5 the finding cites.

## Pass criteria

- [ ] Evidence critic returns a 🔴 finding on candidate #1 citing "hypothesis not explicitly flagged" (§5.5 forbidden-semantic line "Any hypothesis not explicitly flagged as such — hypotheses disguised as evidence are 🔴").
- [ ] Evidence critic returns a 🔴 finding on candidate #2 citing "'Users want X' without a source".
- [ ] Evidence critic returns a 🔴 finding on candidate #3 citing "'Many people ask for W' without numbers or quotes".
- [ ] All three findings are severity 🔴 (blocker), not 🟡 or 🟢.

## Fail examples

- Critic returns 🟡 on candidate #1 because the content could be reformulated — severity must be 🔴 until reformulated.
- Critic accepts candidate #3 because the phrase "CSV export" is concrete, ignoring the absence of numeric or quote evidence.
