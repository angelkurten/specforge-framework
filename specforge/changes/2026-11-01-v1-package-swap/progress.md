# Progress

**Budget**: 23 iterations, 10 USD, cumulative (raised by the human for the fix round)

## Tasks

- [x] tools/cli/tests/integration/v1-swap.test.ts 1 prepublish exits 0 and its bundle holds v2 only (move templates/prd,adr,agdr,roadmap,system-artifact.md, examples/prd-001-login-example.md, examples/system-artifact-example.md, CONVENTIONS.md and scripts/prd-check.py under history/v1/ at the same relative path, with python3 shutil.move; write examples/contract-example.md from specforge/changes/archive/2026-10-29-audit-fixes-web/contract.md and evidence.md with a header naming the source; drop CONVENTIONS.md and scripts/prd-check.py from FRAMEWORK_FILES. The .claude/ moves and .claude/rules/specforge.md are already done by the lead)
- [x] tools/cli/tests/integration/v1-swap.test.ts 2 every moved path is retired, and nothing retired ships (RETIRED_FILES: the 31 entries, no globs, with the append-only comment)
- [x] tools/cli/tests/integration/v1-swap.test.ts 3 an update from a 0.30.0-shaped install removes v1, keeps edits, and halts on a drifted CLAUDE.md
- [x] scripts/v1_swap_test.py test_4 (history/v1/ layout)
- [x] scripts/v1_swap_test.py test_5 (CLAUDE.md rewritten for v2, at most 50 lines; specforge.md is the lead's and should already pass)
- [x] scripts/v1_swap_test.py test_6 (docs/migration-v1-to-v2.md per the contract's Scope; keep migration_guide_test and migration_guide_fix_test green)
- [x] tools/cli/tests/conformance/v2.test.ts (README.md, README.es.md and tools/cli/README.md rewritten for v2; no shipped file names a moved path or a v1 agent name)
- [x] the rewrites the contract lists: prepublish.test.ts, init.test.ts (prepublish-built bundle), update.test.ts (team-edited subagent), pack-and-run.test.ts row 44, partition.test.ts (classifies framework files correctly), helpers.ts shipped list, rule-frontmatter.test.ts (real shipped rules)
- [x] `.github/workflows/v2-ci.yml`: drop prd_check_test, add v1_swap_test; every suite listed there passes; `pnpm --dir tools/cli test` passes; `pnpm --dir tools/cli exec tsc -p tsconfig.json --noEmit` is clean
- [ ] scripts/v1_swap_fix_test.py test_8 (docs/migration-v1-to-v2.md "Updating from 0.30.x": every edited v1 file incl. agents still dispatchable, full rollback vs single file with @0.30.x for every later update, --erase collects agents/templates/examples) and test_9 (CLAUDE.md: history/v1/ lives in specforge's source repository)
- [ ] scripts/v1_swap_fix_test.py test_10 (remove the stale workflow.md claim from the BUNDLE_ONLY_FILES comment in tools/cli/src/partition.ts); add `v1_swap_fix_test` to `.github/workflows/v2-ci.yml`; every suite there and `pnpm --dir tools/cli test` pass

## Blocked

## Log
- Task 1: moved 9 files under history/v1/, wrote examples/contract-example.md, dropped CONVENTIONS.md and scripts/prd-check.py from FRAMEWORK_FILES; `vitest run v1-swap.test.ts -t "1 prepublish"` → 1 passed (26 files bundled).
- Task 2: RETIRED_FILES in partition.ts now holds the 31 exact paths (8 rules, 14 agents, 5 templates, 2 examples, CONVENTIONS.md, prd-check.py) with the append-only comment; `vitest run v1-swap.test.ts -t "2 every"` → 1 passed.
- Task 3: no code change needed (tasks 1-2 already satisfy it); `vitest run tests/integration/v1-swap.test.ts` → 3 passed (scenario 3: 29 retired removed under --strategy=theirs, CLAUDE.md drift halt, own specforge.md drift).
- Task 4: no change needed (the moves from tasks 1 and the lead already satisfy it); `python3 scripts/v1_swap_test.py V1Swap.test_4_...` → OK (1 test).
- Task 5: rewrote CLAUDE.md for v2 (41 lines, four modes, six steps, core/skills/scripts/sibling/history); `python3 scripts/v1_swap_test.py` → test_4 ok, test_5 ok, test_6 FAIL (next task).
- Task 6: rewrote docs/migration-v1-to-v2.md (1.0.0 removes v1, three update cases, rollback, --erase note, Draft PRD pinned to 0.30.x); `v1_swap_test.py` → 3 ok, `migration_guide_test.py` → 7 ok, `migration_guide_fix_test.py` → 5 ok.
- Task 7: rewrote README.md, README.es.md and tools/cli/README.md for v2 (Upgrading sections keep specforge EVA and the guide URL); `vitest run tests/conformance/v2.test.ts` → 5 passed; `migration_guide_test.py` and `v1_swap_test.py` → OK.
- Task 8: rewrote prepublish, init, update, pack-and-run row 44, partition and rule-frontmatter tests, added SHIPPED_DEFINITIONS to helpers.ts, and removed the two retired files (framework.test.ts, prd_check_test.py); `pnpm --dir tools/cli test` → 42 files, 272 passed; `tsc --noEmit` → clean.
- Task 9: v2-ci.yml now lists v1_swap_test instead of prd_check_test; every suite in the list → exit 0; `pnpm --dir tools/cli test` → 42 files, 272 passed; `tsc --noEmit` → clean.
