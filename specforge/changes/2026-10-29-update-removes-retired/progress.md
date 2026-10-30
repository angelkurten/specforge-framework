# Progress

**Budget**: 10 iterations, 4 USD

## Tasks

- [ ] tools/cli/tests/integration/update-retire.test.ts 1 an untouched retired file is removed with its emptied directory; kept files stay
- [ ] tools/cli/tests/integration/update-retire.test.ts 2 an edited retired file is kept under strategy none, ours and theirs
- [ ] tools/cli/tests/integration/update-retire.test.ts 3 team data, untracked files and already-missing files are left alone
- [ ] tools/cli/tests/integration/update-retire.test.ts 4 --dry-run lists removals and kept files and changes nothing
- [ ] tools/cli/tests/integration/update-retire.test.ts 5 the repository root and a directory with a non-framework file are never removed
- [ ] tools/cli/tests/integration/update-retire.test.ts 6 an undeclared dropped file stays as today, and a declared file still in the bundle is refreshed
- [ ] the full CLI suite passes: `pnpm --dir tools/cli test`, and `pnpm --dir tools/cli exec tsc -p tsconfig.json --noEmit` is clean

## Blocked

## Log
