# Changelog

All notable changes to the specforge framework are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/). Versions follow [Semantic Versioning](https://semver.org/): MAJOR for breaking rule/template changes, MINOR for new features, PATCH for fixes and docs.

**Team data files** (`SIBLINGS.md`, your PRDs, your ADRs) are never touched by upgrades. Only framework files change between versions.

---

## [0.3.0] - 2026-04-13

### Added
- MkDocs Material documentation site at `docs/`.
- `CHANGELOG.md` and `VERSION` file for release tracking.
- `scripts/upgrade.sh` for safe framework upgrades.

### Changed
- README: link to hosted docs site.
- Pinned `mkdocs-material` in `requirements-docs.txt`.

## [0.2.0] - 2026-04-12

### Added
- User-gate and post-implementation re-review in workflow steps 8/9.
- `.claude/rules/` subtree: `hard-rules.md`, `workflow.md`, `gate-block.md`, `prd-authoring.md`, `adr-specific.md`, `framework-maintenance.md`.
- Sibling projects model with `SIBLINGS.md` registry.

### Changed
- Slimmed `CLAUDE.md` to a pointer file; behavioural rules moved to `.claude/rules/`.
- README workflow diagram: shows sibling fan-out and cyclic review.

## [0.1.0] - 2026-04-11

### Added
- Initial commit: templates, examples, agents, conventions, hard rules, workflow.

[0.3.0]: https://github.com/angelkurten/specforge-framework/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/angelkurten/specforge-framework/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/angelkurten/specforge-framework/releases/tag/v0.1.0
