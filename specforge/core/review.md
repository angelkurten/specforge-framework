# Review

After the loop finishes, a reviewer that did not write the change looks for ways it breaks its contract. Its job is to find failures, not to confirm the work. Independence comes from a clean context: same model, no memory of writing the code.

## Two halves

1. **The script decides what a pattern can.** `python3 specforge/scripts/review_prep.py <change> --base <ref>` reports added skip markers, deleted test files, removed test functions, changed locked tests and an incomplete evidence report as blockers, and added stubs as should-fix. It prints a packet for the reviewer, and exits 1 on any blocker.
2. **The reviewer reads for what a pattern cannot.** It starts from the packet and treats the script's findings as settled. It never re-reports them, and never argues one away.

## What the reviewer checks

- **Contract.** Every scenario in Acceptance evidence has a test that would fail without the change. Nothing in the diff falls outside Scope. Every Constraint holds.
- **Tests.** No test passes trivially (`assert True`, a mock asserted to return what it was told to). No test is tied to the implementation instead of the behaviour: private internals, an exact call order the contract does not state. A test asserting an absence names the broken implementation it would fail against.
- **Cheating a pattern misses.** Assertions weakened in tests that were not locked. Exceptions swallowed. Expected values special-cased in the code.
- **Evidence.** The reviewer re-runs the commands under Ran and compares the output with Result. It reads the CI runs the `CI` field names. They must be the runs on the last commit that changed code or tests before the commit that holds the report, since a report cannot name its own commit's runs. It also reads the runs on the pushed head directly, so an evidence-only follow-up is covered too. A missing, red or unnamed run is a blocker. Not checked is plausible, except for a user-visible path (see Exercised below), and nothing that was skipped is claimed as checked. Every deviation from the contract is recorded.
- **Exercised.** A change with user-visible behaviour (a page, a CLI command, or an HTTP route another repository calls) shows that path run against the real system, in a browser or a real client, not a fake. A Not checked entry on that path is a blocker, not a plausible omission. So is a missing `Exercised` line, or `none — …` written for a change that does have such a path. The 2026-10-29 blind audit found the team page dead in a real browser (no CORS, preflight answered 405) after 14 passing tests and a Not checked line saying it was never run in one.
- **Docs that send adopters to the CLI.** A page telling adopters to run `npx @angelkurten/specforge …` for new behaviour names the first release that carries it. At HEAD the code may already do it while the published CLI does not (change `2026-10-25-migration-guide`).

**Controlled mode, and any change whose contract shows a high-risk signal from `specforge/core/modes.md` § Risk** (authentication, authorization, secrets, payments or PII, among others), adds the security checklist:
- authentication and authorization on every new entry point;
- input that reaches storage or execution is validated;
- no response reveals, by its content, status or timing, whether a record exists that the caller may not know about;
- no secret in code, config or logs;
- no PII in logs;
- every new dependency named and justified.

A Contract change with high risk once passed review with a login that answered in 0.9 ms for an unknown email and 23.4 ms for a wrong password, which revealed every registered email (`specforge-pilot`, change `2026-10-25-register-and-login`).

**The edge checklist** applies to every Contract and Controlled change, beside the security checklist that applies to high risk only:
- bounds that match across every route accepting the same value;
- normalization (strip, case, NFC) applied where a value is compared as well as where it is stored, and bounds read after it;
- control and invisible characters refused at trust boundaries;
- existing code that consumes a value whose domain the change widens;
- code that reads or removes a path: a symlink, checked with `lstat` and never followed; a directory; an unreadable file; and any error other than not-found (change 2026-10-29-update-removes-retired);
- an order the API promises travels in a list, never in a JSON object's keys: a JS client lists integer-like keys first. When the change spans siblings, the contract fixes the shape on both sides (change `2026-10-27-team-stats`).

The checklist comes from the blind audit of the pilot (`../specforge-pilot/specforge/changes/archive/2026-10-25-audit-fixes`).

## Design mode

Optional, before Red, for a high-risk change that touches design (schema, migration, an invariant across routes). The lead dispatches `specforge-reviewer` with `Mode: design` and one `Perspective`, once per perspective. The reviewer reads the contract and the code it names, with no diff and no evidence.

- **backend**: the data model, migration and rollback, public-contract compatibility, and invariants across routes.
- **security**: the security checklist above.
- **quality**: every Scope item has an Acceptance scenario that would fail without it, premises are checkable, and the edge checklist holds.

The report follows § Report, with each `file:line` pointing into the contract or the code it names. The lead puts the findings into the contract before Red.

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

`review_prep.py` compares every lock at the base with every lock at HEAD, both read from git and paired by canonical path, where `changes/archive/<name>/` counts as `changes/<name>/`. A second lock for the same change is reported in its own right. A lock that is not a regular file at HEAD, or that changed type in the range, is a blocker, and `lock_tests.py` refuses a symlinked lock, so neither the loop nor `archive.py` runs on one. It reports as should-fix a removed lock, a removed entry, a changed hash, and any history line added or removed, counted per copy. A dirty working tree or an archive move in the range does not hide one. It does not attribute them; a diff cannot say who ran a command. The reviewer lists each one, and the human confirms each before a PASS stands. An approved test that changed without a human confirming it is the one defect this framework exists to catch.

The script also reports as should-fix every entry at HEAD that the lock's first version in the range lacks, such as a fix round's new test: `approved entry added after the first approval, confirm it: <entry>`. The first version is the base's, or else the first commit in the range that holds the lock, so a first approval reports nothing. The human confirms each like any other lock change (changes `2026-10-27-web-scaffold`, `2026-10-27-team-stats`).

A test listed in another change's lock, archived or not, is still approved. `review_prep.py` reports as should-fix every such test the range edits or deletes, naming the change that locked it, and the human confirms it like any lock change (change `2026-10-26-release-0-28-0`).

