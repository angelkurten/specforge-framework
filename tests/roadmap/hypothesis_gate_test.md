# Test #8: Hypothesis gating — Candidate/Later + promotion block

**Type**: conformance
**PRD reference**: [PRD-001 §9 row #8](../../001-product-roadmap.md#9-test-plan)

## What this verifies

Items whose only evidence is a category-6 hypothesis must auto-start as `Candidate` / `Later` and cannot be promoted to `Committed` until a non-hypothesis entry is added (§5.5). This closes the loophole where a bare hypothesis becomes indistinguishable from "would be nice to have". A failure here means speculative items can be committed without validation.

## Fixtures

Candidate item with exactly one evidence entry, a falsifiable hypothesis:

```markdown
### ROADMAP-050: hypothesis-only-item
**Status**: Candidate
**Horizon**: Later
**Last reviewed**: 2026-04-19
**Problem / outcome**: admins may discover bulk actions if surfaced in the item table.
**User**: admin
**Siblings likely impacted**: specforge

**Evidence**:
- hypothesis: admins will adopt bulk actions once made discoverable; validate via usability test, N>=6 admin users, success = >=3/6 complete bulk edit without prompting
```

Then a user attempt to promote `ROADMAP-050` from `Candidate` to `Committed` without adding non-hypothesis evidence.

Then a second attempt after appending a non-hypothesis entry:

```markdown
- SUPPORT-234, SUPPORT-441
```

## Steps

1. Write ROADMAP-050 from the fixture (step 7 of §4.1). Record `status` and `horizon` as written.
2. User attempts to edit `ROADMAP-050` changing `Status: Committed` without adding non-hypothesis evidence. Record the lead agent's response.
3. User adds `- SUPPORT-234, SUPPORT-441` to the Evidence list, then retries the promotion to `Committed`. Record the lead agent's response.

## Pass criteria

- [ ] On initial write, ROADMAP-050 is recorded with `Status: Candidate` (not Committed, not Shipped, not Parked).
- [ ] On initial write, ROADMAP-050 is recorded with `Horizon: Later` (not Now, not Next).
- [ ] The promotion attempt in step 2 is rejected by the lead agent with a message citing §5.5 "Hypothesis-only items are gated" and naming the requirement to add a non-hypothesis entry.
- [ ] After step 3 (non-hypothesis entry added), the promotion to `Committed` is accepted.
- [ ] `last_reviewed` is re-stamped to today UTC on the successful promotion in step 3.

## Fail examples

- Initial write records `Horizon: Now` because the user specified it — the gate overrides user input when evidence is hypothesis-only.
- The rejection message in step 2 is generic ("cannot promote") without citing the hypothesis gate rule — the reviewer must be able to trace the rejection to §5.5.
