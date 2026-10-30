# `update`'s retired-file removal is safe to fail and to restart

**Mode**: Controlled

```
MODE PROPOSAL
Risk: high — deletes files on adopters' disks; the current order can leave an install that refuses its next update
Uncertainty: low — the design mode's backend run names each defect at a line of tools/cli/src/commands/update.ts, and the lead reproduced the blocker
Controlled flag: yes — DECISIONS.md 2026-10-29 puts retiring v1 in Controlled because of the external kubbo installation
Mode: Controlled
```

Confirmed by the human, 2026-10-29, as change 1b of the plan to retire v1. It comes before the file swap, so 1.0.0 never ships the defects of change `2026-10-29-update-removes-retired`, which is archived and unreleased.

## Outcome

When a retired file cannot be read, an `update` stops before it writes anything, so the next `update` runs as if the failed one never happened. A retired file is never removed when it is the same file as one the bundle ships: a case-only rename, a Unicode-normalization alias or a hard link. It is never removed through a symlinked directory, and never read outside the repository. A removal that fails does not strand the install. The notice that a file stopped being tracked survives `--quiet`. The recovery path for a retired file is documented and tried.

## Scope

In, all in `tools/cli/src/commands/update.ts`, applied the same way in the dry run and in the real run:
- **Lexical check first, no I/O.** A retired path that is absolute, holds a `..` segment or resolves outside cwd (`lexicalResolve`) is never read. It prints `kept    <path> (outside the repository; not read)` and leaves the manifest.
- **Classify once.** Every other retired path is classified before any write: `lstat`, then sha for a regular file. In a real run this happens inside the lock, after the merge refusal and the drift halt, which keep their exit 1 and their precedence. In a dry run it happens without a lock, as today.
  - `ENOENT` or `ENOTDIR` (an ancestor is a file): already gone.
  - Any other `lstat` or read error: in a real run, exit 10 with no file written and the manifest unchanged, and a remediation naming the path. In a dry run, the existing `  error   <path> (<code>)` line and exit 0.
  - A directory gives `EISDIR` on read, so it takes this same branch, as the locked tests pin.
  - A symlink, or a non-regular file that is neither a file nor a directory (a FIFO, a socket): kept and never read. It prints `(symlink; not followed)` or `(not a regular file; not read)`.
  - **Symlink in path**: any ancestor directory below cwd that is a symlink means kept, printed `(symlink in path; not followed)`. An `lstat` error on an ancestor is a read error.
- **Check again just before each unlink** (real run): re-run the ancestor walk, `lstat` the path and re-hash it. Anything that no longer matches an untouched regular file with no symlinked ancestor is kept, printed with the reason, and the run goes on.
- **Same file as a bundle path**: if a bundle path exists on disk and shares the retired path's `dev`+`ino`, the retired path is kept. It prints `kept    <path> (same file as <bundle path>)`. This is checked at classification in a dry run and just before the unlink in a real run, after the refresh.
- **Unlink failure** (`EACCES`, `EPERM`, `EBUSY`, any error): not fatal. It prints `kept    <path> (<code>)`, the path leaves the manifest, the run goes on and writes the manifest, and the exit is 0.
- **`--quiet`**: every `kept` and `error` line, in the dry run and the real run, goes out through `summary`. `remove` and `write` lines stay on `info`.
- **Printed paths**: control characters (C0 and DEL) in a printed path are escaped as `\xNN`.
- `tools/cli/tests/integration/update-retire-hardening.test.ts` (`new`).

In, docs:
- `docs/migration-v1-to-v2.md`: a short "Getting a retired file back" note. Restore the single file with `git restore` or `git checkout <commit> -- <path>`, or extract it from the previous package (`npm pack @angelkurten/specforge@<previous>`). A file restored this way is not in the manifest, so `update` never touches it again. `init --force` from an older version is not a recovery: it overwrites edited framework files and downgrades the install.
- `specforge/DECISIONS.md`, one entry recording three choices:
  - the recovery path;
  - no git-tree guard on `update`'s removal: the removed bytes equal the install bytes, which are in the package and in git;
  - `RETIRED_FILES` is append-only across releases.
- `tools/cli/src/partition.ts`: the comment on `RETIRED_FILES` says it is append-only.

Out:
- `compareAll`'s own drift halt on a case-only rename of a bundle path. It predates change 1.
- The cleanup climb, whose `rmdir` already stops on any error and never follows a link.
- `init --force --erase`.
- A git guard.
- The `EACCES` asymmetry with `compareAll`'s missing-locally probe, which is accepted.

## Context

- `tools/cli/src/commands/update.ts` at `03b97c9`:
  - `retiredRels` (line 112);
  - `compareAll` (line 116);
  - the dry-run loop (lines 154-178);
  - the refresh loop (line 212);
  - the retired loop (lines 234-255);
  - the summary (line 282).
- `tools/cli/src/output.ts`: `info` is silenced by `--quiet`, `summary` is not (lines 21-32).
- `tools/cli/src/safe-fs.ts` `safeResolve` (line 59): it checks only that the realpath stays in cwd.
- The design-mode report on the archived contract `2026-10-29-update-removes-retired`, recorded in `specforge/changes/archive/2026-10-29-reviewer-design-mode/evidence.md` § Exercised.
- **Run:**
  - `pnpm --dir tools/cli exec vitest run <file>`;
  - `pnpm --dir tools/cli test` (531 tests);
  - `pnpm --dir tools/cli exec tsc -p tsconfig.json --noEmit`.

## Constraints

- Every test in `update-retire.test.ts`, `update-retire-fix.test.ts` and `update-retire-fix2.test.ts` stays green and unchanged; the archived change locked them. The two `doctor.test.ts` tests that pin undeclared paths stay green.
- No new dependency and no new exit code. A write error during the refresh still exits 10, as today.
- Tests never rely on `chmod 000`, which fails to make a file unreadable under root. They use a directory (`EISDIR`) and a FIFO.

## Premises

- The refresh loop runs before the retired-file loop, so a retired read error lands after files are written (the lead reproduced the restart failure in a scratch clone of `8535de1`) — `grep -n "for (const u of toUpdate)\|for (const rel of retiredRels)" tools/cli/src/commands/update.ts` → holds
- `info` is silenced by `--quiet` and `summary` is not — `grep -n "if (opts.quiet) return" tools/cli/src/output.ts` → holds

## Acceptance evidence

`tools/cli/tests/integration/update-retire-hardening.test.ts`:

1. A directory at a declared retired path makes a real `update` exit 10. The error names the path, no bundle file is rewritten (a changed `CLAUDE.md` keeps its old bytes), and the manifest is byte-identical. Once the directory is replaced by the untouched file, the next `update` exits 0, refreshes `CLAUDE.md` and removes the file. Fails against classifying after the refresh, where the restart halted on drift.
2. A retired file that is a hard link to a path the new bundle ships stays on disk with its link count intact. The bundle path holds the new bytes, `kept    <retired> (same file as <bundle path>)` is printed in the dry run and in the real run, and the exit is 0 under `--strategy=theirs`. Fails against a removal decided by path string, which deletes the bundle's file.
3. A retired file reached through a symlinked parent directory whose target is inside the repository is kept, printed as `(symlink in path; not followed)` in the dry run and the real run. The target file survives with its bytes. Fails against today's `safeUnlink`, which unlinks through the link.
4. A manifest entry `examples/../../outside.md` matching a declared `examples/**` is never read or removed. A file at that place outside the repository survives, the line `(outside the repository; not read)` is printed, and the exit is 0.
5. A FIFO at a retired path is kept and printed `(not a regular file; not read)`, and the run finishes. Fails against hashing it, which blocks forever; the test has a 10 s timeout.
6. An unlink that fails is not fatal. An untouched retired file inside a directory that cannot take writes (mode 0555), skipped under uid 0 and recorded under Not checked, prints `kept    <path> (EACCES)`, the run exits 0, and the manifest is written without the path.
7. With `--quiet`, the `kept` lines of an edited retired file still print, in the dry run and the real run. The `remove` line does not.
8. A retired path whose name holds `\x1b` is printed as `\x1b`, never as the raw byte.

`pnpm --dir tools/cli test` and `tsc` pass. The lead's Controlled mutation sample is recorded. Exercised, with a real packed variant:
- scenario 1's restart;
- `git restore` of a removed retired file, after which the next `update` leaves it alone.

`v2-ci` and `cli-ci` pass on the last code commit.

## Approvals

- Mode Controlled and change 1b ahead of change 3: the human, 2026-10-29.
- Design mode (required in Controlled), all three perspectives: BLOCK from each, 3 blockers. The resolutions above were applied by the lead and approved by the human, 2026-10-29: lexical check first; recovery by `git restore` and not `init --force`; the climb out of Scope. Re-verification of the design follows.

## Stop and escalate

Stop and ask if a locked test must change, or if classifying before any write needs a change to `compareAll`'s contract. Budget: 14 iterations, 6 USD, for 10 tasks (8 scenarios, the full suite, the docs and decision).
