# Review

After the loop finishes, a reviewer that did not write the change looks for ways it breaks its contract. Its job is to find failures, not to confirm the work. Independence comes from a clean context: same model, no memory of writing the code.

## Two halves

1. **The script decides what a pattern can.** `python3 specforge/scripts/review_prep.py <change> --base <ref>` reports added skip markers, deleted test files, removed test functions, changed locked tests and an incomplete evidence report as blockers, and added stubs as should-fix. It prints a packet for the reviewer, and exits 1 on any blocker.
2. **The reviewer reads for what a pattern cannot.** It starts from the packet and treats the script's findings as settled. It never re-reports them, and never argues one away.

## What the reviewer checks

- **Contract.** Every scenario in Acceptance evidence has a test that would fail without the change. Nothing in the diff falls outside Scope. Every Constraint holds.
- **Tests.** No test passes trivially (`assert True`, a mock asserted to return what it was told to). No test is tied to the implementation instead of the behaviour: private internals, an exact call order the contract does not state. A test asserting an absence names the broken implementation it would fail against.
- **Cheating a pattern misses.** Assertions weakened in tests that were not locked. Exceptions swallowed. Expected values special-cased in the code.
- **Evidence.** The reviewer re-runs the commands under Ran and compares the output with Result. It reads the CI runs the `CI` field names. They must be the runs on the last commit that changed code or tests, since a report cannot name the runs of the commit that holds it. It also reads the runs on the pushed head directly, so an evidence-only follow-up is covered too. A missing, red or unnamed run is a blocker. Not checked is plausible, and nothing that was skipped is claimed as checked. Every deviation from the contract is recorded.

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

`review_prep.py` compares every lock at the base with every lock at HEAD, both read from git and paired by canonical path, where `changes/archive/<name>/` counts as `changes/<name>/`. A second lock for the same change is reported in its own right. **Known gap, accepted by the human on 2026-10-24 until the pilot:** a `locked-tests.txt` committed as a symlink is compared as its link text, not as the file it points to. A re-approval hidden that way shows in the diff only as a typechange (`T`) on `locked-tests.txt`, so the reviewer checks for one. It reports as should-fix a removed lock, a removed entry, a changed hash, and any history line added or removed, counted per copy. A dirty working tree or an archive move in the range does not hide one. It does not attribute them; a diff cannot say who ran a command. The reviewer lists each one, and the human confirms each before a PASS stands. An approved test that changed without a human confirming it is the one defect this framework exists to catch.

