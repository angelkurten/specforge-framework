# Test #6: PII 🔴 cannot be refuted

**Type**: conformance
**PRD reference**: [PRD-001 §9 row #6](../../001-product-roadmap.md#9-test-plan)

## What this verifies

The carve-out in §4.1 states that PII findings from the syntactic table cannot be resolved by `refute` — only `reformulate` or `kill`. The lead agent at step 6 must enforce this identity-based restriction regardless of severity. A failure here means a contributor can "refute" a PII 🔴 with free text and slip the raw quote through.

## Fixtures

One candidate item with `Visibility: public` carrying an email pattern in a category-4 quote (reuse Fixture 1 public variant from test #5):

```markdown
**Evidence**:
- 'please add bulk export' — jane.doe@example.com, 2026-03-18
```

Evidence critic has returned 🔴 (email regex, public visibility).

Three user-resolution attempts at step 6:

A. User attempts `refute: this is a public-facing customer, no privacy concern`.
B. User attempts `reformulate: 'please add bulk export' — customer, channel: support email, 2026-03-18` (email stripped).
C. User attempts `kill`.

## Steps

1. Submit resolution A to the lead agent at step 6.
2. Submit resolution B to the lead agent at step 6.
3. Submit resolution C to the lead agent at step 6.
4. Record which resolutions the lead agent accepts and which it rejects.

## Pass criteria

- [ ] Resolution A (`refute`) is rejected by the lead agent with a message referencing the §4.1 PII carve-out.
- [ ] The rejection message explicitly names the only two legal resolutions: `reformulate` and `kill`.
- [ ] Resolution B (`reformulate` with PII stripped) is accepted; the item proceeds to write with the anonymised quote.
- [ ] Resolution C (`kill`) is accepted; the item is dropped and never reaches write.
- [ ] The item as originally written (with `jane.doe@example.com`) never lands in `ROADMAP.md` under any resolution path.

## Fail examples

- Lead agent accepts resolution A because the user provided a free-text justification — carve-out is identity-based (PII-derived finding), not rhetoric-based.
- Lead agent accepts resolution B but writes the original (un-anonymised) text, not the reformulation.
