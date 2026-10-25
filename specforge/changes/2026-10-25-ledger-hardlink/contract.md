# The ledger never writes through a hard link

**Mode**: Contract

## Outcome

`loop.py` writes `loop-runs.txt` by replacing it with a new file, never in place. A hard link an agent puts in place of the ledger can no longer make `loop.py` overwrite the linked file. A ledger whose bytes are not UTF-8 stops the run with exit 4 instead of a traceback. These are the two known gaps `specforge/core/loop.md` records from `2026-10-25-loop-budget`.

## Scope

In:
- **Writes.** Every write of the ledger goes to a temporary file in the change folder, followed by `os.replace` onto `loop-runs.txt`. That covers the restore of an altered ledger and the per-iteration append. A hard link is then left pointing at its own, unchanged inode.
- **Reads.** The ledger is read as bytes and decoded as UTF-8. On failure the run stops with exit 4, naming `loop-runs.txt`, before any agent runs.
- **Docs.** `specforge/core/loop.md` drops both gaps from its known-gaps sentence.

Out:
- `cost_of` accepting NaN, infinity or negative costs (fourth-review nit of `2026-10-25-loop-budget`).
- A detached process, or an agent that edits `loop.py` or the `**Budget**:` line, which the threat ceiling leaves to diff review.

## Context

- `specforge/scripts/loop.py`:
  - `:141-151` reads the ledger, `read_text` at `:144`;
  - `:172-182` the between-iteration check, with `write_bytes` at `:177` and the append at `:178-179`.
- `specforge/core/loop.md:52`: the threat ceiling and its known gaps.
- `scripts/loop_budget_fix3_test.py`: the agent-driven fixture this change's test follows.
- `specforge/changes/archive/2026-10-25-loop-budget/evidence.md`: the fourth-review debt list.

## Constraints

- Standard library only.
- The temporary file sits in the change folder, so `os.replace` stays on one filesystem.
- Every suite in `.github/workflows/v2-ci.yml` still passes, the four `loop_budget*` suites included.
- The stop messages from scenarios 11-14 of `2026-10-25-loop-budget` are unchanged.

## Premises

- `os.replace` onto a path that is a hard link replaces the directory entry and leaves the other link's content alone — `python3 -c "import os,tempfile;d=tempfile.mkdtemp();v=os.path.join(d,'v');l=os.path.join(d,'l');open(v,'w').write('precious');os.link(v,l);t=os.path.join(d,'t');open(t,'w').write('new');os.replace(t,l);print(open(v).read(),open(l).read())"` → holds: `precious new`.
- The ledger read is the only path where non-UTF-8 bytes raise — `grep -n "read_text" specforge/scripts/loop.py` → holds: the ledger read at line 144, plus `progress.md` and the contract, which the agent writes as text anyway.

## Acceptance evidence

`python3 scripts/loop_budget_fix4_test.py` and every suite in `v2-ci.yml` pass:

1. An iteration that replaces `loop-runs.txt` with a hard link to another file stops with exit 4 and the existing "restored" message. The other file's bytes are unchanged, and the ledger holds the earlier lines plus this iteration's line. This fails against an in-place `write_bytes`.
2. A ledger that is already a hard link to another file when a run starts gets its iteration lines, and the other file's bytes stay unchanged. This fails against an in-place append.
3. A ledger holding non-UTF-8 bytes stops the run with exit 4, naming `loop-runs.txt`, with no traceback and no agent run.
4. `specforge/core/loop.md` no longer lists the hard-link and non-UTF-8 gaps.

## Stop and escalate

Stop and ask if `os.replace` breaks an existing suite, or if a scenario needs a change to a stop message. Budget: 6 iterations, 2.50 USD, for 5 tasks (4 scenarios and the full suite).
