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

When a retired file cannot be read, an `update` stops before it writes anything, so the next `update` runs as if the failed one never happened. A retired file is never removed when it is the same file as one the bundle ships: a case-only rename on macOS or Windows, or a path through a symlinked directory. The notice that a file stopped being tracked survives `--quiet`. The recovery path for a retired file is documented and tried.

## Scope

In, all in `tools/cli/src/commands/update.ts`:
- **Classify first.** Every retired path is classified (`lstat`, then sha) before the first write, next to `compareAll`. A read error other than `ENOENT` in a real run exits 10 with no file written and the manifest unchanged. The dry run's `error   <path> (<code>)` line is kept.
- **Same file as a bundle path.** A retired path whose lowercase form equals the lowercase form of a path in the new bundle is never removed. It prints `kept    <path> (same file as <bundle path>)` and leaves the manifest.
- **Symlinked directory.** A retired path that has a symlink in any ancestor directory below the repository root is never removed. It prints `kept    <path> (symlink in path; not followed)`. Climbing to remove emptied directories stops at the first ancestor that is a symlink or not empty. A cleanup error is never fatal.
- **`--quiet`.** Every `kept    …` line goes out through `summary`, which `--quiet` does not suppress. `remove  …` lines stay on `info`.
- `tools/cli/tests/integration/update-retire-hardening.test.ts` (`new`).

In, docs:
- `docs/migration-v1-to-v2.md`: a short "Getting a retired file back" note, covering git restore, or `npx @angelkurten/specforge@<previous> init --force` from the previous version.
- `specforge/DECISIONS.md`, one entry recording four choices:
  - the recovery path;
  - no git-tree guard on `update`'s removal: the removed bytes equal the install bytes, and those are in the package and in git;
  - `RETIRED_FILES` is append-only across releases;
  - two accepted gaps: the `EACCES` asymmetry with `compareAll`'s missing-locally probe, and an edit saved between the sha check and the unlink.
- `tools/cli/src/partition.ts`: the comment on `RETIRED_FILES` says it is append-only.

Out:
- `compareAll`'s own case-only-rename drift halt, which already behaved this way before change 1.
- `init --force --erase`.
- A git guard.

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

- Every test in `update-retire.test.ts`, `update-retire-fix.test.ts` and `update-retire-fix2.test.ts` stays green and unchanged. Those are locked by the archived change. The two `doctor.test.ts` tests that pin undeclared paths stay green.
- No new dependency and no new exit code. A refresh error after classification still exits 10, as today.

## Premises

- The refresh loop runs before the retired-file loop, so a retired read error lands after files are written (the lead reproduced the restart failure in a scratch clone of `8535de1`) — `grep -n "for (const u of toUpdate)\|for (const rel of retiredRels)" tools/cli/src/commands/update.ts` → holds
- `info` is silenced by `--quiet` and `summary` is not — `grep -n "if (opts.quiet) return" tools/cli/src/output.ts` → holds

## Acceptance evidence

`tools/cli/tests/integration/update-retire-hardening.test.ts`:

1. An unreadable retired file makes `update` exit 10 with no bundle file rewritten and the manifest byte-identical. After the file becomes readable, the next `update` exits 0 and refreshes and removes as usual.
2. A retired `examples/Foo.md`, whose new bundle ships `examples/foo.md`, is never removed under `--strategy=theirs`. The bundle's file is on disk with the new bytes afterwards, and `kept    examples/Foo.md (same file as examples/foo.md)` is printed.
3. A retired file reached through a symlinked parent directory is kept and printed as `(symlink in path; not followed)`. The link and its target directory survive.
4. With `--quiet`, the `kept` line for an edited retired file is still printed. The `remove` line is not.
5. The climb that removes emptied directories never removes a symlinked directory. An `rmdir` error during it does not change the exit code.

`pnpm --dir tools/cli test` and `tsc` pass. The lead's Controlled mutation sample is recorded. Exercised: a real packed variant runs scenario 1's restart, and a 0.30.0 `init --force` restores a retired file over a 0.31.0 variant install. `v2-ci` and `cli-ci` pass on the last code commit.

## Approvals

- Mode Controlled and change 1b ahead of change 3: the human, 2026-10-29.

## Stop and escalate

Stop and ask if a locked test must change, or if classifying before any write needs a change to `compareAll`'s contract. Budget: 12 iterations, 5 USD, for 7 tasks (5 scenarios, the full suite, the docs and decision).
