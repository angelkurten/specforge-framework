# Progress

**Budget**: 17 iterations, 7 USD, cumulative (raised by the human for the fix round)

## Tasks

- [x] scripts/v2_site_test.py test_1 (move the 19 root PRDs, ADR-001, AgDR-001, ROADMAP.md, tests/README.md, tests/roadmap, tests/sdd-2026, tests/workflow and the seven v1 docs pages under history/v1/ at the same relative path, with python3 shutil.move; write history/v1/README.md; SIBLINGS.md and tests/v2 stay)
- [x] scripts/v2_site_test.py test_2 (mkdocs.yml nav lists exactly the ten v2 pages; write docs/index.md, docs/quickstart.md, docs/faq.md and the six docs/concepts pages; no orphan page)
- [x] scripts/v2_site_test.py test_3 and test_4 (no v1 vocabulary outside the migration guide; each page names its source of truth from the contract's Scope; draw content from specforge/core/, templates/contract.md, the skills, CLAUDE.md and the migration guide)
- [x] scripts/v2_site_test.py test_5 (every relative link under docs/ resolves; keep it passing)
- [x] `v2_site_test` is in `.github/workflows/v2-ci.yml`; every suite listed there passes; `pnpm --dir tools/cli test` passes
- [ ] scripts/v2_site_fix_test.py test_6, test_7 and test_8 (mkdocs.yml site_description; history/v1/README.md names the dangling links; repoint every relative link in CHANGELOG.md to where its target now is, under history/v1/ — change only the link targets)
- [ ] scripts/v2_site_fix_test.py test_9 and test_10 (correct the concept pages, faq.md, quickstart.md and concepts/siblings.md against specforge/core/{modes,loop,review,compose}.md, templates/contract.md and the skills); add `v2_site_fix_test` to `.github/workflows/v2-ci.yml`; every suite there passes

## Blocked

## Log
task 1: moved the PRDs, ADR/AgDR, ROADMAP, tests/* and 7 docs pages with shutil.move, wrote history/v1/README.md; `python3 scripts/v2_site_test.py V2Site.test_1...` returned OK.
- Lead: the BLOCKED line was right. test_1 required the four replaced v1 pages gone while tests 2 and 4 required v2 pages at the same paths. The lead fixed test_1: a replaced page must differ from its history/v1 copy. The human re-approved the lock (2026-11-02).
task 2: nav and the ten v2 pages already in the tree (uncommitted); `python3 scripts/v2_site_test.py` returned 5 tests OK (test_2 included).
task 3: pages from task 2 already satisfy the vocabulary and source-of-truth checks; `python3 scripts/v2_site_test.py` returned 5 tests OK (test_3 and test_4 included).
task 4: links already resolve; `python3 scripts/v2_site_test.py` returned 5 tests OK (test_5 included).
task 5: added v2_site_test to v2-ci.yml; every v2-ci Python suite exited 0 and `pnpm --dir tools/cli test` returned 42 files, 272 tests passed.
