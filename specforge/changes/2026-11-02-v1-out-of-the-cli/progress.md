# Progress

**Budget**: 20 iterations, 9 USD

## Tasks

- [ ] tools/cli/tests/integration/v1-cli.test.ts scenario 1 (remove the nine v1 validators, their test files under tests/unit/validators/, their index.ts entries, and the helpers validators/gate-fence.ts and validators/roadmap-parse.ts; stale-briefings stays; rewrite doctor.test.ts's planted-violation, --rule and all-validators tests per the contract)
- [ ] v1-cli.test.ts scenario 2 (remove --ignore-sibling from cli.ts MULTI_FLAGS, usage and known flags, ignoreSiblings from validators/types.ts and commands/doctor.ts; doctor --json schema_version "2" without exclusions; rewrite cli.test.ts's --json shape test; drop the --ignore-sibling flag from .github/workflows/cli-ci.yml's doctor step in the same commit)
- [ ] v1-cli.test.ts scenario 3 (init writes no SIBLINGS.md or ROADMAP.md, dry-run count is bundled + 1, next-steps line names specforge doctor and /specforge-classify; drop TRACKED_TEAM_DATA and the PRD-003 citations in cli.ts and init.ts; rewrite init.test.ts's placeholders test and pack-and-run.test.ts's layout test)
- [ ] v1-cli.test.ts scenario 4 (the install probe: lstat, never fs.access; refuses on .specforge, CLAUDE.md, .claude/rules and any path the bundle would write, symlinks included; no longer on SIBLINGS.md or a root NNN-*.md)
- [ ] v1-cli.test.ts scenario 5 (TEAM_DATA_PATTERNS loses SIBLINGS.md, ROADMAP.md and the PRD/ADR/AgDR patterns; rewrite partition.test.ts's team-data tests; subagent-frontmatter.test.ts plants SHIPPED_DEFINITIONS and asserts its length)
- [ ] v1-cli.test.ts scenario 7 (rule-frontmatter: KNOWN_PATH_SCOPED goes; paths: present and not a list, null included, is an error; rewrite the two adr-specific tests in rule-frontmatter.test.ts under a generic name, giving the no-paths fixture paths: as a string)
- [ ] tools/cli/tests/unit/yaml.test.ts scenario 6 (already green; keep it green after deleting gate-block.test.ts)
- [ ] scripts/v1_cli_test.py and scripts/v2_site_test.py test_1 (git mv SIBLINGS.md history/v1/SIBLINGS.md; history/v1/README.md names history/v1/SIBLINGS.md and drops the stays-at-the-root sentence; CHANGELOG.md line 7; the migration guide's doctor-in-1.0.0 text, without backticking SIBLINGS.md or agents/ and without the word placeholder; the DECISIONS.md entry with 9 of 16)
- [ ] `v1_cli_test` is in `.github/workflows/v2-ci.yml`; every suite listed there passes; `pnpm --dir tools/cli test` passes; `node tools/cli/dist/src/cli.js doctor` in this repository exits 0

## Blocked

## Log
