# Progress

**Budget**: 20 iterations, 8 USD, cumulative (raised by the human for fix round 1)

## Tasks

- [x] tools/cli/tests/integration/update-retire-hardening.test.ts 1 a read error stops the run before any write, and the next run starts clean
- [x] tools/cli/tests/integration/update-retire-hardening.test.ts 2 a retired hard link to a bundle path is kept, decided before the refresh rewrites it
- [x] tools/cli/tests/integration/update-retire-hardening.test.ts 3 a case-only alias of a bundle path is kept under --strategy=theirs
- [x] tools/cli/tests/integration/update-retire-hardening.test.ts 4 a retired file under a symlinked parent is kept, inside or outside the repository
- [x] tools/cli/tests/integration/update-retire-hardening.test.ts 5 a manifest path that leaves the repository is never read
- [x] tools/cli/tests/integration/update-retire-hardening.test.ts 6 a FIFO at a retired path is kept and never read
- [x] tools/cli/tests/integration/update-retire-hardening.test.ts 7 an unlink that fails is not fatal
- [x] tools/cli/tests/integration/update-retire-hardening.test.ts 8 kept lines survive --quiet in the dry run and the real run; remove lines do not
- [x] tools/cli/tests/integration/update-retire-hardening.test.ts 9 control, backslash and bidi characters in a printed path are escaped
- [x] docs and decision: the "Getting a retired file back" note in docs/migration-v1-to-v2.md, the DECISIONS.md entry (four choices), and the append-only comment on RETIRED_FILES in tools/cli/src/partition.ts
- [x] the full CLI suite passes: `pnpm --dir tools/cli test`, and `pnpm --dir tools/cli exec tsc -p tsconfig.json --noEmit` is clean
- [x] contract Scope "Check again just before each unlink" (no test can open the race; the lead checks it by reading): in the real run, just before each `safeUnlink`, call `classifyRetired` again for that path (ancestor walk, lstat, the same O_NONBLOCK+fstat reader). Remove only if it is still `file` with the install sha; otherwise print the matching `kept    <path> (<reason>)` line through `summary` and go on. No error at this point is fatal. Keep all 540 tests green.
- [x] escape the path everywhere it is printed: `esc(rel)` in the exit-10 `printError` message and remediation, and `esc(twin)` in the `same file as` reason. Keep all 540 tests green and tsc clean.
- [x] tools/cli/tests/integration/update-retire-hardening-fix.test.ts 10 a socket at a retired path is kept and never opened (branch on lstat's type before any open; also add O_NOFOLLOW to the open)
- [x] tools/cli/tests/integration/update-retire-hardening-fix.test.ts 11 a bundle path whose identity cannot be read stops a real run before any write (bundleIds ignores only ENOENT; the dry run prints an error line and exits 0); and in docs/migration-v1-to-v2.md the "Getting a retired file back" note says this behaviour ships from 1.0.0. Keep all 542 tests green and tsc clean.

## Blocked

## Log
- Task 1: `classifyRetired` runs inside the lock before the refresh and returns exit 10 on a read error. `vitest run -t "^update-retire-hardening 1 "` passed 1/1; the three archived `update-retire*` files stay green (17 passed, the 8 failures are scenarios 2-9 still unimplemented); `tsc --noEmit` clean.
- Task 2: `bundleIds` (a `dev:ino` map of bundle paths, via `stat` bigint) feeds `classifyRetired`, in the dry run and the real run, before any write. `vitest run -t "^update-retire-hardening [12] "` passed 2/2; scenario 3 also passes (it ran on macOS, case-insensitive); the three archived `update-retire*` files stay green; `tsc --noEmit` clean; the 6 failures left are scenarios 4-9.
- Task 3: no code change needed; the classify-first `dev:ino` check from task 2 covers it. `vitest run -t "^update-retire-hardening 3 "` passed 1/1 on a case-insensitive FS (checked with `touch a; [ -e A ]`), so the real path ran, not the DEVIATION return; the locked test hash still matches locked-tests.txt.
- Task 4: `classifyRetired` now walks the ancestor directories with `lstat` before the path itself and keeps the file as `symlink in path; not followed`. `vitest run` on the hardening file + the three archived `update-retire*` files: scenario 4 passes, archived 16/16 green, the 5 failures left are scenarios 5-9; `tsc --noEmit` clean; locked test hash unchanged.
- Task 5: `classifyRetired` starts with a lexical check (absolute, `..` segment or `lexicalResolve` failure) and keeps the path as `outside the repository; not read` with no I/O. `vitest run -t "5 a manifest"` passed 1/1; archived `update-retire*` 16/16 green; `tsc --noEmit` clean; locked test hash OK; 4 failures left are scenarios 6-9.
- Task 6: `classifyRetired` reads with `open(O_RDONLY|O_NONBLOCK)` + `fstat` on the handle: a directory stays `EISDIR` (error), a non-regular file is kept as `not a regular file; not read`. `vitest run` on the hardening file + the three archived `update-retire*` files: scenario 6 passes, 22/25 green, the 3 failures left are scenarios 7-9; `tsc --noEmit` clean; locked test hash unchanged.
- Task 7: the `safeUnlink` call in the real run is wrapped in try/catch: a failure prints `kept    <path> (<code>)`, counts as kept and the run goes on (the path is already outside the manifest rebuild). `vitest run` on the hardening file + the three archived `update-retire*` files: scenario 7 passes, 23/25 green, the 2 failures left are scenarios 8-9; `tsc --noEmit` clean; locked test hash unchanged.
- Task 8: every `kept` and `error` line in the dry run and the real run now goes out through `summary`; `remove`/`write` stay on `info`. `vitest run` on the hardening file + the three archived `update-retire*` files: scenario 8 passes, 24/25 green, the 1 failure left is scenario 9; `tsc --noEmit` clean; locked test hash unchanged.
- Task 9: `esc` in `update.ts` escapes backslash, C0/DEL/C1 as `\xNN` and bidi/zero-width as `\u{XXXX}`; every printed `rel` (kept/error/remove, dry run and real run) goes through it. `vitest run tests/integration/update-retire` passed 25/25 (all four files); `tsc --noEmit` clean; locked test hash unchanged.
- Task 10: added the "Getting a retired file back" note to `docs/migration-v1-to-v2.md`, the four-choice entry to `specforge/DECISIONS.md` and the append-only comment on `RETIRED_FILES` in `partition.ts`. `grep -c` finds each (1, 1, 1); `tsc --noEmit` clean.
- Task 11: `pnpm --dir tools/cli test` passed 540/540 (39 files); `tsc --noEmit` exit 0; locked test hash matches locked-tests.txt.
- Task 12: the real run calls `classifyRetired` again just before each `safeUnlink`; anything but an untouched `file` with the install sha is kept through `summary` and the run goes on (`gone` is skipped). `vitest run tests/integration/update-retire` 25/25, `pnpm --dir tools/cli test` 540/540, `tsc --noEmit` exit 0, locked test hash matches.
- Task 13: `esc(rel)` now in the exit-10 `printError` message and remediation, and `esc(twin)` in the `same file as` reason. `pnpm --dir tools/cli test` 540/540, `tsc --noEmit` exit 0, locked test hash OK.
- Task 14: `classifyRetired` keeps any non-file, non-directory `lstat` type as `not a regular file; not read` before the open, and the open adds `O_NOFOLLOW`. `vitest run tests/integration/update-retire`: 26/27 (scenario 10 passes; the one failure is scenario 11, task 15); `tsc --noEmit` exit 0; locked test hashes match.
- Task 15: `bundleIds` ignores only `ENOENT` and returns the failing path; the real run exits 10 naming it before any write, the dry run prints an `error` line and exits 0; the migration note says the behaviour ships from 1.0.0. `pnpm --dir tools/cli test` 542/542, `tsc --noEmit` exit 0, locked test hashes OK.
