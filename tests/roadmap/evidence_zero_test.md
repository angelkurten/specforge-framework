# Test #2: Evidence rejection — zero categories

**Type**: conformance
**PRD reference**: [PRD-001 §9 row #2](../../001-product-roadmap.md#9-test-plan)

## What this verifies

Items without any entry from the six evidence categories must not reach the write step. Consolidation (§4.1 step 4) is required to soft-flag them, and the evidence critic (§5.7) must independently return 🔴. A failure here means an item with no justification could slip into `ROADMAP.md`, violating hard-rule 12.

## Fixtures

Two candidate items:

1. Evidence section present but empty:
   ```markdown
   **Evidence**:
   ```
2. Evidence section with a single uncategorised bullet (no category label, not matching any of the 6 shapes in §5.5):
   ```markdown
   **Evidence**:
   - we should probably do this
   ```

## Steps

1. Feed both fixtures through consolidation (§4.1 step 4 pre-filter).
2. Dispatch the evidence critic briefing (`agents/roadmap-evidence-critic.md`) with `{{PANEL_MODE}}: critique` and both fixtures as `{{CANDIDATE_ITEMS}}`.
3. Record the consolidation pre-filter output and the evidence critic findings per candidate.

## Pass criteria

- [ ] Consolidation pre-filter emits a soft flag on candidate #1 (empty evidence list).
- [ ] Consolidation pre-filter emits a soft flag on candidate #2 (evidence present but zero entries match any of the 6 categories in §5.5).
- [ ] Evidence critic returns a 🔴 finding on candidate #1 naming "zero evidence entries" (or equivalent language tying to hard-rule 12).
- [ ] Evidence critic returns a 🔴 finding on candidate #2 naming "zero categorised evidence entries" or "uncategorised bullet".
- [ ] Neither candidate reaches step 7 (write) — both must be killed or reformulated by the user.

## Fail examples

- Consolidation flags candidate #1 but not candidate #2 because the bullet exists at all (regardless of category).
- Evidence critic returns 🟡 (should-fix) instead of 🔴 (blocker) — severity must be blocker per §5.7.
