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

When a retired file cannot be read, an `update` stops before it writes anything, so the next `update` runs as if the failed one never happened. A retired file is never removed when it is the same file as one the bundle ships: a case-only rename or a Unicode-normalization alias on a filesystem that ignores them, or a hard link. Identity is the file's `dev`+`ino`, taken before any write. It is never removed through a symlinked directory, and never read outside the repository. A removal that fails does not strand the install. The notice that a file stopped being tracked survives `--quiet`. The recovery path for a retired file is documented and tried.

## Scope

In, all in `tools/cli/src/commands/update.ts`, applied the same way in the dry run and in the real run:
- **Lexical check first, no I/O.** A retired path that is absolute, holds a `..` segment or resolves outside cwd (`lexicalResolve`) is never read. It prints `kept    <path> (outside the repository; not read)` and leaves the manifest.
- **Classify once, in this order.** Every other retired path is classified before any write: the ancestor walk, then `lstat` on the path, then a read of a regular file. The read opens with `O_RDONLY | O_NONBLOCK` and checks `fstat` on the handle before reading. `lstat` uses `{ bigint: true }`. In a real run this happens inside the lock, after the merge refusal and the drift halt, which keep their exit 1 and their precedence. In a dry run it happens without a lock, as today.
  - `ENOENT` or `ENOTDIR` (an ancestor is a file): already gone.
  - Any other `lstat` or read error: in a real run, exit 10 with no file written and the manifest unchanged, and a remediation naming the path. In a dry run, the existing `  error   <path> (<code>)` line and exit 0.
  - A directory gives `EISDIR` on read, so it takes this same branch, as the locked tests pin.
  - A symlink, or a non-regular file that is neither a file nor a directory (a FIFO, a socket): kept and never read. It prints `(symlink; not followed)` or `(not a regular file; not read)`.
  - **Symlink in path**, checked first: any ancestor directory below cwd that is a symlink means kept, printed `(symlink in path; not followed)`, and the path is never read. An `lstat` error on an ancestor is a read error.
- **Check again just before each unlink** (real run): re-run the ancestor walk, `lstat` the path and re-hash it through the same `O_NONBLOCK` and `fstat` reader. Anything that no longer matches an untouched regular file with no symlinked ancestor is kept, printed with the reason, and the run goes on. No error at this point is fatal, `ENOTDIR` included. This is defence in depth for a race between two moments; no deterministic scenario can open that window, and it is recorded under Not checked.
- **Same file as a bundle path**: at classification, before any write and in both modes, the retired path is compared with every bundle path that exists on disk, each statted once into a `dev:ino` map. If one shares its `dev`+`ino`, the retired path is kept: it prints `kept    <path> (same file as <bundle path>)`, and the decision holds even if the refresh later rewrites that bundle path.
- **Unlink failure** (`EACCES`, `EPERM`, `EBUSY`, any error): not fatal. It prints `kept    <path> (<code>)`, the path leaves the manifest, the run goes on and writes the manifest, and the exit is 0.
- **`--quiet`**: every `kept` and `error` line, in the dry run and the real run, goes out through `summary`. `remove` and `write` lines stay on `info`.
- **Printed paths**: a backslash, C0, DEL and C1 controls are escaped as `\xNN`. Bidi and zero-width characters (U+200B-U+200F, U+202A-U+202E, U+2066-U+2069, U+FEFF) are escaped as `\u{XXXX}`.
- `tools/cli/tests/integration/update-retire-hardening.test.ts` (`new`).

In, docs:
- `docs/migration-v1-to-v2.md`: a short "Getting a retired file back" note. Restore the single file with `git restore` or `git checkout <commit> -- <path>`, or extract it from the previous package (`npm pack @angelkurten/specforge@<previous>`). A file restored this way is not in the manifest, so `update` never touches it again. `init --force` from an older version is not a recovery: it overwrites edited framework files and downgrades the install.
- `specforge/DECISIONS.md`, one entry recording four choices:
  - the recovery path;
  - no git-tree guard on `update`'s removal: the removed bytes equal the install bytes, which are in the package and in git;
  - `RETIRED_FILES` is append-only across releases;
  - one accepted gap: an edit saved, or an ancestor swapped for a link, between the last re-check and the unlink. The re-check narrows the window but cannot close it, since the check is path-based.
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
2. A retired file that is a hard link to a bundle path, untouched and with a bundle that rewrites that path under `--strategy=theirs`, is kept: the retired name still exists afterwards, and `kept    <retired> (same file as <bundle path>)` is printed in the dry run and in the real run. Fails against an identity check after the refresh, or none at all: the retired name is removed while it is an alias of a bundle path. On a hard link that shows up as the retired name gone and the bundle file's link count dropping. On a case-insensitive filesystem it deletes the bundle file.
3. A case-only alias, on a case-insensitive filesystem detected at run time, under `--strategy=theirs`. A retired `examples/Foo.md`, installed with the same bytes the bundle's `examples/foo.md` now ships, is kept: the exit is 0, `kept    examples/Foo.md (same file as examples/foo.md)` is printed, and `examples/foo.md` holds the bundle's bytes. Fails against classify-first without the `dev`+`ino` check: the untouched `Foo.md` is unlinked after the refresh, which deletes `examples/foo.md`. With no strategy the drift halt would stop the run before classification, so the scenario names one. On a case-sensitive filesystem the test returns early with a printed `DEVIATION:` line, not a skip marker, and the evidence records which one ran.
4. A retired file reached through a symlinked parent directory whose target is inside the repository is kept, printed as `(symlink in path; not followed)` in the dry run and the real run. The target file survives with its bytes. Fails against today's `safeUnlink`, which unlinks through the link. A second case links a parent directory outside the repository, where the retired name is a regular file holding the install bytes. It is kept with `(symlink in path; not followed)` in the dry run and the real run, and the outside file survives with its bytes. This fails against an `lstat`-or-read-before-walk order: that order would print a different reason, or remove or refuse the file.
5. A manifest entry `examples/../../outside.md` matching a declared `examples/**` is never read or removed. A FIFO at that place outside the repository makes any read hang, and the run finishes within a 10 s timeout with `(outside the repository; not read)` printed and exit 0.
6. A FIFO at a retired path is kept and printed `(not a regular file; not read)`, and the run finishes within a 10 s timeout. Fails against hashing it, which blocks forever.
7. An unlink that fails is not fatal. An untouched retired file inside a directory with mode 0555 prints `kept    <path> (EACCES)`, the run exits 0, and the manifest is written without the path. Under uid 0 the test returns early with a printed `DEVIATION:` line, not a skip marker, for the human to accept or refuse when the tests are approved, and the evidence records whether it ran.
8. With `--quiet`, the `kept` lines of an edited retired file still print, in the dry run and the real run. The `remove` line does not.
9. A retired path holding `\x1b`, a backslash and U+202E prints them as `\x1b`, `\x5c` and `\u{202E}`, never as the raw characters.

`pnpm --dir tools/cli test` and `tsc` pass. The lead's Controlled mutation sample is recorded. Exercised, with a real packed variant:
- scenario 1's restart;
- on this macOS machine (case-insensitive APFS), scenario 3's case alias under `--strategy=theirs`;
- `git restore` of a removed retired file, after which the next `update` leaves it alone.

`v2-ci` and `cli-ci` pass on the last code commit.

## Approvals

- Mode Controlled and change 1b ahead of change 3: the human, 2026-10-29.
- Design mode (required in Controlled), all three perspectives: BLOCK from each, 3 blockers. The resolutions above were applied by the lead and approved by the human, 2026-10-29: lexical check first; recovery by `git restore` and not `init --force`; the climb out of Scope. Re-verification round 1: security PASS, plus one should-fix (the walk before the read); backend PASS, plus should-fix S2 (hard link); quality BLOCK on the same S2. Fix round 1 applied by the lead: identity taken at classification, walk before read, a case-alias scenario, FIFO fixtures for never-read, the early returns. Re-verification round 2: PASS from all three. The should-fixes were applied by the lead before Red: scenario 3 names `--strategy=theirs`, and scenario 4's second case uses a regular file and asserts the reason. The nits were applied too: four choices, the same reader at the re-check, and a `dev:ino` map.

- The red tests in `tools/cli/tests/integration/update-retire-hardening.test.ts`, approved and locked: the human, 2026-10-29. That includes the two `DEVIATION:` early returns, scenario 3 on a case-sensitive filesystem and scenario 7 under uid 0. A draft in a scratch clone passed 540/540 and `tsc` before locking, with scenario 3 run on macOS.

## Stop and escalate

Stop and ask if a locked test must change, or if classifying before any write needs a change to `compareAll`'s contract. Budget: 16 iterations, 7 USD, for 11 tasks (9 scenarios, the full suite, the docs and decision).
