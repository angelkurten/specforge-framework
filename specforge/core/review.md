# Review

After the loop finishes, a reviewer that did not write the change looks for ways it breaks its contract. Its job is to find failures, not to confirm the work. Independence comes from a clean context: same model, no memory of writing the code.

## Two halves

1. **The script decides what a pattern can.** `python3 specforge/scripts/review_prep.py <change> --base <ref>` reports added skip markers, deleted test files, removed test functions, changed locked tests and an incomplete evidence report as blockers, and added stubs as should-fix. It prints a packet for the reviewer, and exits 1 on any blocker.
2. **The reviewer reads for what a pattern cannot.** It starts from the packet and treats the script's findings as settled. It never re-reports them, and never argues one away.

## What the reviewer checks

- **Contract.** Every scenario in Acceptance evidence has a test that would fail without the change. Nothing in the diff falls outside Scope. Every Constraint holds.
- **Tests.** No test passes trivially (`assert True`, a mock asserted to return what it was told to). No test is tied to the implementation instead of the behaviour: private internals, an exact call order the contract does not state. A test asserting an absence names the broken implementation it would fail against.
- **Cheating a pattern misses.** Assertions weakened in tests that were not locked. Exceptions swallowed. Expected values special-cased in the code.
- **Evidence.** The reviewer re-runs the commands under Ran and compares the output with Result. Not checked is plausible, and nothing that was skipped is claimed as checked. Every deviation from the contract is recorded.

**Controlled mode** adds the security checklist:
- authentication and authorization on every new entry point;
- input that reaches storage or execution is validated;
- no secret in code, config or logs;
- no PII in logs;
- every new dependency named and justified.

## Report

```
VERDICT: PASS | BLOCK
blocker: <file>:<line> — <what is wrong>; breaks <contract section or rule>
should-fix: <file>:<line> — …
nit: <file>:<line> — …
CHECKED: <one line per check above: what was read or run>
```

- A finding without a `file:line` is dropped.
- The verdict is BLOCK when the reviewer or the script reports any blocker.
- `CHECKED` is never empty. A PASS has to say what it looked at.

## Lock changes

`review_prep.py` reports every change to a `locked-tests.txt` it diffs as should-fix: a new history line, a changed hash or a removed entry. It does not attribute them; a diff cannot say who ran a command. The reviewer lists each one, and the human confirms each before a PASS stands. An approved test that changed without a human confirming it is the one defect this framework exists to catch.

