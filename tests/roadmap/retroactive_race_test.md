# Test #15: Retroactive numbering collision

**Type**: conformance
**PRD reference**: [PRD-001 §9 row #15](../../001-product-roadmap.md#9-test-plan)

## What this verifies

The optimistic concurrency rule in §6.2: when the gate-filling agent creates a retroactive item, it must check-before-write against `ROADMAP.md` on disk and increment past any number already taken since grounding. A failure here means two concurrent flows can overwrite each other's items.

## Fixtures

Starting `ROADMAP.md`:

```markdown
### ROADMAP-041: previous-item
**Status**: Shipped
...

### ROADMAP-042: in-flight-candidate
**Status**: Candidate
**Horizon**: Next
...
```

Gate-filling agent grounded when max number was `042` (both 041 and 042 existed).

Simulate a concurrent commit landing between grounding and write — another agent having just added `ROADMAP-043`. The file on disk at write time contains ROADMAP-041, 042, and 043.

Sample PRD without `Roadmap item:` header, triggering retroactive creation.

## Steps

1. Ground the gate-filling agent (record max number: 042).
2. Simulate the concurrent commit adding `ROADMAP-043` (update the fixture file on disk).
3. Run the gate-filling agent's write step with the check-before-write logic.
4. Read the resulting `ROADMAP.md`.

## Pass criteria

- [ ] The new retroactive item is numbered `ROADMAP-044` (next after the current on-disk max of 043), not 043 and not 042.
- [ ] `ROADMAP-041`, `ROADMAP-042`, and `ROADMAP-043` are all preserved verbatim — no overwrite.
- [ ] The agent's transcript or log notes a retry event (grounded max was 042, observed max at write was 043, incremented to 044).
- [ ] Final file is valid per test #1 regex anchors (no duplicate item ids, no skipped-header corruption).

## Fail examples

- New item is written as `ROADMAP-043`, overwriting the concurrently added 043 entry.
- Agent fails silently on collision without retry — it must retry once the write check shows a conflict.
- Final file contains two `ROADMAP-043` headings (no check-before-write was performed).
