# Progress

**Budget**: 20 iterations, 9 USD

## Tasks

- [ ] tools/cli/tests/integration/v1-swap.test.ts 1 prepublish exits 0 and its bundle holds v2 only (move templates/prd,adr,agdr,roadmap,system-artifact.md, examples/prd-001-login-example.md, examples/system-artifact-example.md, CONVENTIONS.md and scripts/prd-check.py under history/v1/ at the same relative path, with python3 shutil.move; write examples/contract-example.md from specforge/changes/archive/2026-10-29-audit-fixes-web/contract.md and evidence.md with a header naming the source; drop CONVENTIONS.md and scripts/prd-check.py from FRAMEWORK_FILES. The .claude/ moves and .claude/rules/specforge.md are already done by the lead)
- [ ] tools/cli/tests/integration/v1-swap.test.ts 2 every moved path is retired, and nothing retired ships (RETIRED_FILES: the 31 entries, no globs, with the append-only comment)
- [ ] tools/cli/tests/integration/v1-swap.test.ts 3 an update from a 0.30.0-shaped install removes v1, keeps edits, and halts on a drifted CLAUDE.md
- [ ] scripts/v1_swap_test.py test_4 (history/v1/ layout)
- [ ] scripts/v1_swap_test.py test_5 (CLAUDE.md rewritten for v2, at most 50 lines; specforge.md is the lead's and should already pass)
- [ ] scripts/v1_swap_test.py test_6 (docs/migration-v1-to-v2.md per the contract's Scope; keep migration_guide_test and migration_guide_fix_test green)
- [ ] tools/cli/tests/conformance/v2.test.ts (README.md, README.es.md and tools/cli/README.md rewritten for v2; no shipped file names a moved path or a v1 agent name)
- [ ] the rewrites the contract lists: prepublish.test.ts, init.test.ts (prepublish-built bundle), update.test.ts (team-edited subagent), pack-and-run.test.ts row 44, partition.test.ts (classifies framework files correctly), helpers.ts shipped list, rule-frontmatter.test.ts (real shipped rules)
- [ ] `.github/workflows/v2-ci.yml`: drop prd_check_test, add v1_swap_test; every suite listed there passes; `pnpm --dir tools/cli test` passes; `pnpm --dir tools/cli exec tsc -p tsconfig.json --noEmit` is clean

## Blocked

## Log
