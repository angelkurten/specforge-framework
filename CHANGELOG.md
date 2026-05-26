# Changelog

All notable changes to the specforge framework are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/). Versions follow [Semantic Versioning](https://semver.org/): MAJOR for breaking rule/template changes, MINOR for new features, PATCH for fixes and docs.

**Team data files** (`SIBLINGS.md`, your PRDs, your ADRs) are never touched by upgrades. Only framework files change between versions.

---

## [Unreleased]

Tracked by [PRD-002: SDD-2026 Framework Alignment](002-sdd-2026-framework-alignment.md) (`Status: Draft` — not yet gate-promoted; `VERSION` bumps to 0.6.0 when the gate is filled).

### Added
- `.claude/rules/hard-rules.md`: invariant **13** — PRDs/ADRs are not a code-regeneration source (rejects the "spec-as-source" pattern); plus an "Override immunity" preamble stating the invariants are not waived by later-context instructions.
- `.claude/rules/prd-authoring.md`: two decision-table rows (small observable change → `SYSTEM_ARTIFACT.md` note; autonomous high-blast-radius decision → optional AgDR), an optional § 2 Goals event/condition phrasing note, an "Optional artifact: Agent Decision Records" section, and an `AgDR-NNN` naming row.
- `templates/agdr.md` — Agent Decision Record template (opt-in, rare; does not gate promotion).
- `CONVENTIONS.md` § 2: AgDR naming subsection.
- `.claude/rules/workflow.md` step 9: AgDR-emission line in the implementation-team brief.

### Changed
- "12 invariants" → "13 invariants" caption in `CLAUDE.md`, `README.md`, `README.es.md`; `docs/faq.md` corrected from a stale "11" to "13".
- `tests/roadmap/hard_rules_12_test.md`: count guard revised from hard-coded "exactly 12 / no rule 13" to caption-synchronization. This revises the conformance contract of [PRD-001 §9 row #25](001-product-roadmap.md#9-test-plan); PRD-001 stays frozen.
- `templates/prd.md` § 2 Goals: comment gains the optional reactive-goal phrasing hint.

### Compat
- Backward-compatible. All edits are additive; no existing PRD, ADR, or team-data file changes. AgDR is opt-in and non-retroactive; the § 2 Goals phrasing is a suggestion only.

## [0.5.0] - 2026-04-19

### Added
- `.claude/rules/model-selection.md` — per-role model assignment for sub-agent dispatch. Prescribes `opus` for adversarial / high-blast-radius roles (`backend-reviewer`, `security-reviewer`, `roadmap-evidence-critic`, `roadmap-risk-critic`), `sonnet` for multi-source synthesis (`frontend-reviewer`, `quality-reviewer`, `roadmap-market-generator`, `roadmap-ux-generator`, `roadmap-devils-advocate-critic`, `roadmap-opportunity-cost-critic`), and `haiku` for mechanical extraction (`roadmap-product-generator`, `roadmap-support-generator`).

### Changed
- `CLAUDE.md`: `model-selection.md` pointer added under always-loaded rules (48 lines total, under the 50-line target).

### Notes
- The `effort` frontmatter field was evaluated in this workspace (16 parallel runs across sonnet and opus, `high` vs `low` vs absent). Deltas fell within intra-group variance. The rule file explicitly declines to prescribe `effort` until release notes confirm support.

### Compat
- Backward-compatible. Teams without explicit model defaults continue to inherit from the parent session.

## [0.4.0] - 2026-04-19

### Added
- **Product roadmap planning cycle** (PRD-001). Introduces `ROADMAP.md` as a global living document capturing product-level intent (problem, user, evidence, status, horizon) with no technical detail.
- `.claude/rules/roadmap.md` — the canonical rule file for the roadmap cycle (unscoped, always loaded).
- `templates/roadmap.md` — blank starter for adopting teams.
- Two-panel workflow: 4 generator briefings (`roadmap-{product,ux,market,support}-generator.md`) + 4 critic briefings (`roadmap-{evidence,devils-advocate,opportunity-cost,risk}-critic.md`) in `agents/`.
- Six evidence categories with syntactic forbidden-patterns (PII detection, competitor-URL credential detection, image/paste blocks).
- Identity-based PII carve-out: findings from syntactic patterns cannot be `refute`d at any severity; only `reformulate` or `kill` are legal resolutions.
- Canonical `untrusted-evidence` fence spec with `␛BACKTICK␛` escape to mitigate prompt-injection via user-supplied evidence text.
- `Visibility: public | private` header field on `ROADMAP.md` to modulate PII severity (strict-by-default).
- Optional `Roadmap item: ROADMAP-NNN` PRD header field, with retroactive-escape at gate promotion for PRDs that lack it.
- Hard rule 12 in `hard-rules.md`: evidence discipline and PII carve-out as framework-level invariants.
- `tests/roadmap/` — 32 conformance walkthroughs matching PRD-001 §9 Test Plan.
- New docs page: [Concepts → Roadmap](https://angelkurten.github.io/specforge-framework/concepts/roadmap/).

### Changed
- `CLAUDE.md`: fourth row `ROADMAP.md` in the mental-model table; `roadmap.md` bullet under always-loaded rules; "11 invariants" → "12 invariants" (47 lines total, under the 50-line target).
- `workflow.md`: step 1 now captures `Roadmap item:` header when applicable; step 9 closes with an auto-update bullet flipping the linked roadmap item to `Shipped` in the same commit as the gate block.
- `prd-authoring.md`: documents the optional `Roadmap item:` header field and the retroactive-escape semantics.
- `framework-maintenance.md`: new "Generator/critic briefing variant" subsection documenting the 4-variable generator contract and 5-variable critic contract (distinct from the 5-variable PRD reviewer contract).
- `scripts/upgrade.sh`: `ROADMAP.md` added to `TEAM_FILES` so adopting teams' roadmap data is never overwritten by upgrades.
- `SIBLINGS.md`: `specforge` self-reference row added (required by hard-rule 11 for PRD-001).

### Compat
- Backward-compatible. PRDs authored before PRD-001 are grandfathered — the `Roadmap item:` header is optional and the retroactive-escape flow covers them on their next ship.

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

[0.5.0]: https://github.com/angelkurten/specforge-framework/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/angelkurten/specforge-framework/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/angelkurten/specforge-framework/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/angelkurten/specforge-framework/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/angelkurten/specforge-framework/releases/tag/v0.1.0
