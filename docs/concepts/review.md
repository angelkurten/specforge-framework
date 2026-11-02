# Review

Source of truth: `specforge/core/review.md`. The `specforge-review` skill runs it.

After the loop, a reviewer that did not write the change looks for ways it breaks its contract. Its job is to find failures, not to confirm the work. Independence comes from a clean context: same model, no memory of writing the code.

## Two halves

1. **The script decides what a pattern can.** `review_prep.py` reports added skip markers, deleted tests, changed locked tests and an incomplete evidence report as blockers, and added stubs as should-fix.
2. **The reviewer reads for what a pattern cannot.** It treats the script's findings as settled and does not re-report them.

## What the reviewer checks

- **Contract.** Every scenario has a test that would fail without the change, nothing falls outside Scope, every Constraint holds.
- **Tests.** None passes trivially or is tied to the implementation.
- **Evidence.** It re-runs the commands and compares the output.
- **Exercised.** A change with user-visible behaviour shows that path run against the real system, in a browser or a real client. A missing Exercised entry on that path is a blocker.
- **Security and edge checklists**, for high risk and for every Contract change respectively.

## Design mode

Before red, for Controlled changes and for high-risk Contract changes that touch design, the reviewer runs in design mode: it reads the contract and the code it names, with no diff, once per perspective (backend, security, quality). Its findings go into the contract before any test is written.

## Report

```
VERDICT: PASS | BLOCK
blocker: <file>:<line> — <what is wrong>
CHECKED: <what was read or run>
```

A finding without a `file:line` is dropped, and `CHECKED` is never empty. Next: [Compose](compose.md).
