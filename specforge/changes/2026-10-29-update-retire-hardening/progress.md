# Progress

**Budget**: 16 iterations, 7 USD

## Tasks

- [ ] tools/cli/tests/integration/update-retire-hardening.test.ts 1 a read error stops the run before any write, and the next run starts clean
- [ ] tools/cli/tests/integration/update-retire-hardening.test.ts 2 a retired hard link to a bundle path is kept, decided before the refresh rewrites it
- [ ] tools/cli/tests/integration/update-retire-hardening.test.ts 3 a case-only alias of a bundle path is kept under --strategy=theirs
- [ ] tools/cli/tests/integration/update-retire-hardening.test.ts 4 a retired file under a symlinked parent is kept, inside or outside the repository
- [ ] tools/cli/tests/integration/update-retire-hardening.test.ts 5 a manifest path that leaves the repository is never read
- [ ] tools/cli/tests/integration/update-retire-hardening.test.ts 6 a FIFO at a retired path is kept and never read
- [ ] tools/cli/tests/integration/update-retire-hardening.test.ts 7 an unlink that fails is not fatal
- [ ] tools/cli/tests/integration/update-retire-hardening.test.ts 8 kept lines survive --quiet in the dry run and the real run; remove lines do not
- [ ] tools/cli/tests/integration/update-retire-hardening.test.ts 9 control, backslash and bidi characters in a printed path are escaped
- [ ] docs and decision: the "Getting a retired file back" note in docs/migration-v1-to-v2.md, the DECISIONS.md entry (four choices), and the append-only comment on RETIRED_FILES in tools/cli/src/partition.ts
- [ ] the full CLI suite passes: `pnpm --dir tools/cli test`, and `pnpm --dir tools/cli exec tsc -p tsconfig.json --noEmit` is clean

## Blocked

## Log
