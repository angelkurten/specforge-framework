# `update` removes framework files the bundle retired

**Mode**: Controlled

```
MODE PROPOSAL
Risk: high — deletes files on adopters' disks through `specforge update`, and changes the CLI's public contract
Uncertainty: low — the inventory names the code paths: update.ts compareAll iterates the new bundle only and the manifest is rebuilt from it, so a retired file is dropped from tracking and left on disk
Controlled flag: unsure — a second team is named: kubbo depends on v1's workflow.md, and its reach is unclear (pinned version or `update`)
Mode: Controlled (unsure resolved to yes)
```

Confirmed by the human, 2026-10-29, as change 1 of 4 in retiring v1 from the package. The 4 changes are: 1 `update` removes retired files; 2 v2 foundations; 3 remove v1; 4 release 1.0.0.

## Outcome

When the framework declares a file retired, `specforge update` removes it from the adopter's repository if the adopter never edited it. If the adopter did edit it, `update` keeps the file and says so. Without this, removing v1 in change 3 would leave every adopter with v1 rules that still load each session, but that nothing tracks or checks.

## Scope

In:
- `tools/cli/src/partition.ts`:
  - `RETIRED_FILES` (`new`): the globs the framework declares retired, in `FRAMEWORK_FILES` syntax. It is empty in this change; change 3 adds v1's globs.
  - `isRetired(rel, patterns = RETIRED_FILES)` (`new`).
- `tools/cli/src/commands/update.ts`:
  - `UpdateOptions.retired` (`new`, optional) defaults to `RETIRED_FILES`, so tests inject their own, as `runPrepublish`'s `bundleOnly` does.
  - A **retired file** is a path in the installed manifest's `framework_files` that meets three conditions: it is absent from the new bundle, it matches `retired`, and it does not match a `TEAM_DATA_PATTERNS` pattern.
  - An undeclared path that the bundle dropped behaves as today: it leaves `framework_files`, its bytes stay on disk, and nothing is printed. Installs from before 0.10 tracked paths such as `CHANGELOG.md`, `VERSION` and `.github/workflows/cli-release.yml` as framework files, and the adopter may now own them (decided by the human, 2026-10-29).
  - For each retired file:
    - **Untouched**: the on-disk sha256 equals `sha256_at_install`. It is removed with `safeUnlink`, and the line `remove  <path>` is printed. Then each parent directory left empty is removed, up to but never including the repository root.
    - **Edited**: the sha differs. It is kept, under any `--strategy`, and the line `kept    <path> (edited; retired from the framework, no longer tracked)` is printed. It never halts the update.
    - **Already gone**: nothing happens.
    - **Dry run**: lists `remove` and `kept` lines and writes nothing.
    - **Summary**: the line gains `, <n> retired removed, <m> retired kept`.
    - Either way, the path leaves `framework_files`, as it does today.
- `tools/cli/tests/integration/update-retire.test.ts` (`new`).

Out:
- Removing any v1 file from the bundle, and filling `RETIRED_FILES`. That is change 3.
- `init --force --erase`, `doctor`, `migrate`, and the `stale-briefings` validator.
- A symlink at a retired path. `safeUnlink` refuses it. It is reported and the run exits 10, the I/O error path.

## Context

- `tools/cli/src/commands/update.ts`:
  - `compareAll` (lines 43-73) iterates only `bundleHashes`;
  - the manifest rebuild (lines 195-204);
  - the dry-run block (lines 137-143);
  - the summary at line 213.
- `tools/cli/src/safe-fs.ts` `safeUnlink` (line 151): it refuses a symlink and resolves paths inside `cwd`.
- `tools/cli/src/partition.ts`: `FRAMEWORK_FILES` (lines 13-50), `BUNDLE_ONLY_FILES` (line 63), `TEAM_DATA_PATTERNS` (line 71) and the private glob matcher `matchesAny` (line 156).
- `tools/cli/tests/integration/doctor.test.ts`: both tests pin undeclared retired paths. The "pre-0.10.0 install carrying the vacated paths stays clean" test (line 249) and the PRD-006 row 9 "stale agents/ manifest entries drop, the files survive" test (line 395) stay unchanged and green.
- `tools/cli/tests/helpers.ts`: `mkTmpDir`, `synthBundleAt` and `synthBundleImportMetaUrl` build a bundle the test controls.
- **Run:** `pnpm --dir tools/cli exec vitest run <file>`. The full suite is `pnpm --dir tools/cli test` (515 tests).

## Constraints

- **Never delete an edited file, a team-data file, a path outside the repository, or a file the old manifest did not track.** `.specforge/manifest.json` itself is never a retired path.
- The manifest is written only after every removal succeeded. On an I/O error the run exits 10 and the manifest is unchanged, so a re-run sees the same retired set.
- No new dependency. Exit codes are unchanged: 0, 1 on drift or merge, 2, 5 and 10.

## Premises

- update has no deletion path today — `grep -c "safeUnlink" tools/cli/src/commands/update.ts` → holds
- The CLI suite passes before the change — `pnpm --dir tools/cli test` → holds

## Acceptance evidence

`tools/cli/tests/integration/update-retire.test.ts`, using a synthetic bundle the test shrinks after `init`, and passing `retired`:

1. An untouched retired file is removed, and its emptied parent directory goes with it. A sibling file kept in the bundle stays. The output has `remove  <path>`, and the manifest no longer lists the path.
2. An edited retired file is kept under no strategy, `ours` and `theirs`. The output has `kept`, and the exit is 0. The manifest no longer lists the path.
3. A retired path matching a team-data pattern (`SIBLINGS.md`, `001-x.md`), a file the old manifest never tracked, and an already-missing file are all left alone.
4. `--dry-run` prints `remove` and `kept` for the retired files and leaves the disk and the manifest byte-identical.
5. The repository root is never removed, even when every framework file is retired. A directory that still holds a non-framework file stays.
6. An untouched file the bundle dropped but `retired` does not declare stays on disk and is not printed, and it leaves the manifest. A path that matches `retired` but is still in the bundle is refreshed, not removed.

`pnpm --dir tools/cli test` passes in full, both `doctor.test.ts` tests above included. `v2-ci` and `cli-ci` pass on the last code commit.

## Approvals

- Mode Controlled and the 4-change split: the human, 2026-10-29.
- Only declared files are removed (`RETIRED_FILES`), not every untouched file the bundle dropped: the human, 2026-10-29, after the draft broke the pre-0.10 test.
- The red tests in `tools/cli/tests/integration/update-retire.test.ts`, approved and locked: the human, 2026-10-29. A draft in a scratch clone passed 523/523 and `tsc` before locking.
- Decisions recorded in `specforge/DECISIONS.md`, 2026-10-29: retiring v1 in 1.0.0, and removing declared retired files only.

## Stop and escalate

Stop and ask if a locked test must change, if a scenario needs a change outside `update.ts`, or if removing a file needs a new exit code. Budget: 10 iterations, 4 USD, for 7 tasks (6 scenarios and the full suite).
