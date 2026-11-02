# The rest of the v1 history moves to history/v1/, and the site is rewritten for v2

**Mode**: Contract

```
MODE PROPOSAL
Risk: low — nothing in the npm package changes: it moves history files and rewrites the docs site, which docs.yml publishes only from main; reverts as a unit
Uncertainty: low — the content exists (specforge/core/, the skills, the migration guide, CLAUDE.md); the site builds offline with mkdocs from the uv cache
Controlled flag: no — nothing a kubbo installation consumes, and the site is not part of the package
Mode: Contract — many files and new pages
```

Confirmed by the human, 2026-11-02, as change 3b of the plan to retire v1. The human chose a full v2 site over a minimal one or keeping the v1 pages. Change 3a already moved the shipped v1 files.

## Outcome

This repository's root holds only v2 and the framework's own files. The docs site explains specforge EVA end to end: what it is, a first change, each step of the cycle, siblings and a FAQ. Every frozen PRD and its test corpus stay readable together under `history/v1/`, where their relative references still resolve.

## Scope

In:
- **`git mv` to `history/v1/`, keeping each relative path:**
  - the 19 PRDs `0NN-*.md`, `ADR-001-determinist-index-for-frozen-corpus.md` and `AgDR-001-vitest-as-cli-test-runner.md`;
  - `ROADMAP.md`;
  - `tests/README.md`, `tests/roadmap/`, `tests/sdd-2026/` and `tests/workflow/` (`tests/v2/` stays);
  - the v1 site pages `docs/index.md`, `docs/quickstart.md`, `docs/faq.md`, `docs/concepts/mental-model.md`, `docs/concepts/siblings.md`, `docs/concepts/roadmap.md` and `docs/workflow/overview.md`, to `history/v1/docs/…`.
- **`history/v1/README.md` (`new`):** what the folder holds, that it is neither loaded nor shipped, and that the paths inside it are relative to `history/v1/`.
- **New v2 pages under `docs/`:**
  - `index.md`: what specforge EVA is, the four modes, the cycle, how to install (`npx @angelkurten/specforge init`), and links to the pages below.
  - `quickstart.md`: a first change, walked through classify, contract, red, loop, review and compose, naming each skill (`specforge-classify`, `specforge-loop`, `specforge-review`, `specforge-compose`) and each script (`lock_tests.py`, `loop.py`, `review_prep.py`, `compose_check.py`, `archive.py`).
  - Six concept pages under `concepts/`, each naming its source of truth:
    - `modes.md`: `specforge/core/modes.md`, `specforge-classify`;
    - `contract.md`: `templates/contract.md`, Premises, Acceptance evidence, `## Retired tests`;
    - `loop.md`: `specforge/core/loop.md`, `specforge-loop`, locked tests;
    - `review.md`: `specforge/core/review.md`, `specforge-review`, Exercised, design mode;
    - `compose.md`: `specforge/core/compose.md`, `specforge-compose`;
    - `siblings.md`: `../<sibling>`, `--add-dir`, `--repo`.
  - `faq.md`: v2 questions.
- **`mkdocs.yml`:** the nav lists exactly the v2 pages and the migration guide.
- `scripts/v2_site_test.py` (`new`), added to `v2-ci`.

Out:
- `SIBLINGS.md`, which `cli-ci`'s `doctor` step needs until change 4.
- `CHANGELOG.md`.
- The npm package.
- A release.

## Context

- `mkdocs.yml` nav (lines with `nav:`); `.github/workflows/docs.yml` deploys only on a push to main.
- `tests/README.md` says the frozen PRDs reference the corpus by path; moving both together under `history/v1/` keeps those relative references.
- `specforge/core/{modes,loop,review,compose}.md`, `templates/contract.md`, `.claude/skills/specforge-*`, `docs/migration-v1-to-v2.md`, `CLAUDE.md`, `README.md`: the content to draw from.
- Locked: `scripts/migration_guide_test.py` (test_2 guide paths exist, test_5 the nav lists the guide), `scripts/v1_swap_test.py` and `scripts/v1_swap_fix_test.py`.
- `uv run --offline --with mkdocs-material mkdocs` runs from the local cache (mkdocs 1.6.1).

## Constraints

- Every locked test stays unchanged and green.
- `mkdocs build --strict` passes offline, into a scratch `site_dir`.
- No page under `docs/` other than the migration guide uses v1 vocabulary.
- No literal invisible character in any written file.

## Premises

- No CI or CLI test reads a root PRD, ROADMAP.md or a v1 site page — `grep -rlE '(^|["/ ])0[0-9]{2}-[a-z-]+\.md|tests/roadmap|tests/sdd-2026|docs/(index|quickstart|faq)' .github scripts/*_test.py` → holds
- mkdocs builds offline from the uv cache — `uv run --offline --with mkdocs-material mkdocs --version` → holds

## Acceptance evidence

`python3 scripts/v2_site_test.py` and every suite in `v2-ci.yml` pass:

1. Every moved path exists under `history/v1/` at its relative path. None remains at the old path, except the four v1 pages a v2 page replaces, which must differ from their copy, and `history/v1/README.md` says it is neither loaded nor shipped.
2. The `mkdocs.yml` nav lists exactly `index.md`, `quickstart.md`, the six concept pages, `migration-v1-to-v2.md` and `faq.md`. Every listed file exists, and no Markdown file under `docs/` is outside the nav.
3. No page under `docs/` except the migration guide names `PRD`, `ADR`, `gate block`, `SYSTEM_ARTIFACT`, `ROADMAP`, `hard rule`, `reviewer panel` or `workflow.md`.
4. Each concept page names its source of truth from Scope, and `quickstart.md` names the six steps in order with each skill and script.
5. Every relative Markdown link under `docs/` resolves to a file.

Exercised: `uv run --offline --with mkdocs-material mkdocs build --strict --site-dir <scratch>` exits 0, and the built `index.html` and one concept page are opened and checked for their headings. `v2-ci` and `cli-ci` pass on the last code commit.

## Approvals

- Mode Contract, and the full v2 site: the human, 2026-11-02.
- The red tests in `scripts/v2_site_test.py`, approved and locked: the human, 2026-11-02. Test 5 passes today by design: it guards the links of the rewritten site.
- test_1 corrected after the loop's BLOCKED, and re-approved by the human, 2026-11-02. Four v1 pages are replaced by v2 pages at the same path (`docs/index.md`, `quickstart.md`, `faq.md`, `concepts/siblings.md`), so each must differ from its `history/v1/` copy instead of being absent.

## Stop and escalate

Stop and ask if a locked test must change, if a moved file is still read by a CI suite, or if mkdocs cannot build offline. Budget: 14 iterations, 6 USD.
