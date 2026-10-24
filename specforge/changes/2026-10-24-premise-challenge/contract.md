# A contract challenges its premises before Red

**Mode**: Contract

## Outcome

A contract names the premises whose failure would make the change wrong, each with the cheapest command that checks it and what it returned. The loop does not start while a premise is unchecked or failed, so a wrong premise costs one command instead of a Red and Green cycle. A failed premise sends the change back to Classify, usually to Explore.

## Scope

In:
- A `## Premises` section in `templates/contract.md`, between Constraints and Acceptance evidence.
- A Challenge phase before Red in `specforge/core/loop.md`.
- `loop.py`: refuse to start when the contract has no Premises section, or when a premise has no result or a failed one.
- `loop.py`: show the agent's stderr when an iteration exits non-zero.

Out:
- Running the premise commands automatically. The lead runs them and records the result; `loop.py` only reads the record.
- Contracts already archived, and changes whose loop already ran.
- Direct and Explore modes, which do not run the loop.

## Context

- Taken from Gentle AI's ODD "challenge" step: before building on a high-consequence premise, execute something to see whether it holds.
- `specforge/scripts/loop.py` `main` refuses a run with no iteration cap through `parser.error` (exit 2); a premise refusal uses the same path.
- `specforge/changes/2026-10-24-symlinked-lock`: its Outcome claimed the loop stops and the change does not archive, a premise nobody checked. `archive.py` calls `lock_tests.check()`, not the command line.

## Constraints

- Standard library only.
- The section's format is fixed so a script can read it: one bullet per premise, `- <premise> — \`<command>\` → holds` or `→ fails: <what it returned>`. A contract with no premise writes `- none` and the reason on the same line.
- Every existing suite in `.github/workflows/v2-ci.yml` still passes; the new suite is added to it. Fixtures whose contracts lack the section are updated, not the rule weakened (decided by the human after the first premise failed): `loop_test.py`, `archive_test.py`, `archive_fix_test.py` and the `reapprove_*` fixtures get a contract with `- none`.
- The premise check runs inside `run()`, after the lock checks, so a broken lock still stops the loop with exit 4 before a contract is read.

## Premises

- Refusing a contract with no Premises section breaks only fixtures this change migrates — `grep -ln "LOOP" scripts/*_test.py` and the fixture contracts they write → holds. As first written ("breaks no existing suite") it failed: `loop_test.py` writes no contract.md at all; `archive_test.py`, `archive_fix_test.py` and the `reapprove_*` fixtures write contracts without the section; `symlinked_lock_fix_test.py` test_6, locked by an active change, runs the loop and expects exit 4. Re-classified: still Contract; the human chose to keep the strict rule and migrate the fixtures, and the check runs after the lock checks.
- The fixtures to migrate are not locked by an active change — `grep -v "^#" specforge/changes/*/locked-tests.txt` → holds: only `scripts/symlinked_lock_test.py` and `scripts/symlinked_lock_fix_test.py` are locked, and neither needs editing once the premise check runs after the lock checks.

## Acceptance evidence

`python3 scripts/premise_challenge_test.py` and every suite in `v2-ci.yml` pass:

1. `templates/contract.md` has a `## Premises` section between `## Constraints` and `## Acceptance evidence`, showing the `→ holds` / `→ fails:` format and the `- none` form.
2. `loop.py` on a change whose contract has no `## Premises` section does not start: exit 2, no agent run, and the message names `Premises`.
3. A premise with no `→ holds` or `→ fails:` does not start the loop: exit 2, and the message quotes the premise.
4. A premise marked `→ fails:` does not start the loop: exit 2, and the message says to re-classify.
5. A contract whose premises all hold, or that says `- none` with a reason, starts the loop. Fails against an implementation that refuses every contract.
6. `specforge/core/loop.md` lists Challenge as the phase before Red.
7. When the agent exits non-zero, `loop.py` prints the tail of its stderr with the iteration line, so a failing agent command is readable without re-running it by hand. From `specforge/changes/2026-10-24-symlinked-lock`: each iteration showed only `agent exit 1`.

## Stop and escalate

Stop if a fixture change would weaken an approved test of another change. Budget: 10 iterations, 5 USD.
