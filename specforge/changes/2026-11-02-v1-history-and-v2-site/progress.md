# Progress

**Budget**: 14 iterations, 6 USD

## Tasks

- [ ] scripts/v2_site_test.py test_1 (move the 19 root PRDs, ADR-001, AgDR-001, ROADMAP.md, tests/README.md, tests/roadmap, tests/sdd-2026, tests/workflow and the seven v1 docs pages under history/v1/ at the same relative path, with python3 shutil.move; write history/v1/README.md; SIBLINGS.md and tests/v2 stay)
- [ ] scripts/v2_site_test.py test_2 (mkdocs.yml nav lists exactly the ten v2 pages; write docs/index.md, docs/quickstart.md, docs/faq.md and the six docs/concepts pages; no orphan page)
- [ ] scripts/v2_site_test.py test_3 and test_4 (no v1 vocabulary outside the migration guide; each page names its source of truth from the contract's Scope; draw content from specforge/core/, templates/contract.md, the skills, CLAUDE.md and the migration guide)
- [ ] scripts/v2_site_test.py test_5 (every relative link under docs/ resolves; keep it passing)
- [ ] `v2_site_test` is in `.github/workflows/v2-ci.yml`; every suite listed there passes; `pnpm --dir tools/cli test` passes

## Blocked

## Log
