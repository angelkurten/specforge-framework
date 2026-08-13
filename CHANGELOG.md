# Changelog

All notable changes to the specforge framework are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/). Versions follow [Semantic Versioning](https://semver.org/): MAJOR for breaking rule/template changes, MINOR for new features, PATCH for fixes and docs.

**Team data files** (`SIBLINGS.md`, your PRDs, your ADRs) are never touched by upgrades. Only framework files change between versions.

---

## [Unreleased]

Tracking [PRD-010: Implementer subagent roles for workflow step 9](010-implementer-subagent-roles.md) (`Status: Draft`, implementation in progress; post-implementation re-review and gate promotion to `Implemented` have not yet run). This section will gain a version number and the `Shipped via` framing once the gate block is filled.

### Added

- Two new subagent definitions, `specforge-backend-implementer` and `specforge-frontend-implementer`, under `.claude/agents/specforge/`, dispatched by name at `workflow.md` step 9 — `tools: Read, Edit, Write, Grep, Glob, Bash, WebFetch`, `model: sonnet`. Each carries an elevated data-not-instructions clause (an injected instruction found while reading is halted and reported, never acted on), a `.claude/agents/**`-plus-frozen-PRD/ADR write exclusion scoped to `SIBLING_ROOT`, and an instruction to actually exercise `Bash` on the sibling's own test suite, linter, type checker, and migration `up`/`down` or production build before reporting.
- `workflow.md` step 9 now dispatches the implementation team by name with a six-field brief contract (`PRD_PATH`, `IMPL_MODE`, `SIBLING_CLAUDE_MD_PATH`, `SIBLING_ROOT`, `SCOPE`, `SYSTEM_ARTIFACT_PATH`) and a `fix-round` mode carrying a `PRIOR_FINDINGS` ledger for every 🔴 plus any 🟡 routed to the fix-in-code destination — closing the gap where a 🔴/🟡 fix previously went back to "the implementation team" with no structured brief.
- `model-selection.md` and `framework-maintenance.md` document the two new roles' default model (`sonnet`), the per-dispatch escalation policy for high-blast-radius scope, and the process for a team adding further implementer roles beyond the two canonical ones.

### Changed

- The three READMEs' "Turning the panels off" / "Apagar los paneles" sections: the `permissions.deny` snippet grows from 12 to 14 entries (`Agent(specforge-backend-implementer)`, `Agent(specforge-frontend-implementer)` appended), the definition-count prose and file-layout tree read 14 (4 reviewers + 4 roadmap generators + 4 critics + 2 implementers), the `WebFetch` domain-scoping paragraph now covers "the six `WebFetch`-holding definitions" instead of only the reviewers, and the risk sentence names the implementer pair's `Edit`/`Write` grant alongside the reviewers' `Bash`/`WebFetch`. The `#turning-the-panels-off` heading itself is unchanged — it is cross-referenced from the frozen `Implemented` PRD-008.
- `docs/workflow/overview.md`, `docs/quickstart.md`, `docs/concepts/siblings.md`, `docs/faq.md`: step 9's description moves from an ad-hoc, three-item brief ("the implementation team", PRD + absolute paths + sibling `CLAUDE.md`) to the named six-field dispatch above, and "the fix goes back to the implementation team" now names the `IMPL_MODE: fix-round` + `PRIOR_FINDINGS` re-dispatch.

### Upgrade note for existing adopters

**Existing installs must hand-append two `permissions.deny` entries.** `.claude/settings.json` sits outside the framework/team-data partition (`tools/cli/src/partition.ts`), so `update` never touches it. A team that pasted the README's 12-entry deny list to opt out of auto-delegation will not automatically pick up `Agent(specforge-backend-implementer)` and `Agent(specforge-frontend-implementer)` — the only two identities this release adds that hold `Edit`/`Write` — and will be silently opted back in for exactly those two unless the entries are added by hand:

```json
"Agent(specforge-backend-implementer)",
"Agent(specforge-frontend-implementer)"
```

**A future revert of this release will not remove the two new definition files from an existing install.** `update` has no deletion path (`runUpdate` builds every state from the bundle's own paths, never from what is absent from it), so if this release is ever reverted, the release notes for that revert must instruct adopters to delete `.claude/agents/specforge/specforge-backend-implementer.md` and `specforge-frontend-implementer.md` by hand — otherwise two `Edit`/`Write`/`Bash`/`WebFetch` subagents stay registered and dispatchable against a `workflow.md` that no longer mentions them.

## [0.12.0] - 2026-08-10

Shipped via [PRD-008: Web access for the review subagents](008-web-access-for-review-subagents.md) (`Status: Implemented`; gate filled after a post-implementation re-review plus two fix rounds cleared, zero 🔴 raised at any point). Roadmap: [ROADMAP-006](ROADMAP.md) `Shipped`. No migration script — frontmatter and documentation only, no CLI code changed.

### Added

- The 4 reviewer subagent definitions (`specforge-backend-reviewer`, `specforge-security-reviewer`, `specforge-frontend-reviewer`, `specforge-quality-reviewer`) gain `WebFetch` in their `tools:` frontmatter, so a reviewer can check a dependency's current changelog or a live CVE advisory while forming a finding. `WebSearch` is deliberately **not** granted — its result shape and prompt-injection surface are undocumented as of 2026-08-09, and unlike `WebFetch`'s dereference-a-named-target shape, `WebSearch` selects its own target from an external ranking that is adversarially optimizable.
- Each reviewer body's existing data-not-instructions clause is extended to name `WebFetch` output, plus a new, separately-stated sentence: content returned by `WebFetch` must never be used to construct or justify a `Bash` invocation. In `post-implementation` mode a reviewer's fetch target can itself derive from the unreviewed diff under review, so this closes the chain where a hostile diff names an attacker-controlled fetch target, the reviewer dereferences it, and the response tries to talk a `Bash`-holding agent into running a command.
- The three READMEs' "Turning the panels off" / "Apagar los paneles" sections gain a worked `.claude/settings.json` example for scoping `WebFetch` to specific domains (`allow` paired with a blanket `deny`), with an explicit caveat that whether this pairing actually restricts fetches — versus the more specific `allow` merely winning — is unverified against Claude Code's documented precedence rules.

### Process note

This PRD was originally drafted to grant `WebFetch`/`WebSearch` to all 12 subagent definitions (reviewers and the 8-role roadmap panel together). The step-5 review panel found the roadmap panel's half unsafe to ship as drafted — the generators' `Rationale` output field is unfenced, the credential/internal-domain URL screen exists in only one of eight bodies and runs after generators would already have fetched, the four generators have no findings channel to report a detected injection, and the clause pattern didn't cover the `Read`-based channel those bodies already have. The panel split: this PRD covers the 4 reviewers only, and the roadmap panel's grant is tracked as [PRD-009](009-web-access-for-roadmap-subagents.md) (`Status: Draft`), seeded with the four gaps and their exact `file:line` citations for whoever picks it up.

## [0.11.0] - 2026-08-09

Shipped via [PRD-006: Subagent briefings and review-loop hardening](006-subagent-briefings-and-review-loop-hardening.md) (`Status: Implemented`; gate filled after a post-implementation re-review plus three fix rounds cleared, one via a step-9 user escalation). Roadmap: [ROADMAP-005](ROADMAP.md) `Shipped`. No migration script — the layout change rides on the partition swap, and the old `agents/` tree ages out via a `doctor` warning and the cleanup notes below.

### Changed

- The 12 reviewer, generator and critic briefings move from `agents/*.md` to Claude Code subagent definitions under `.claude/agents/specforge/`, gaining YAML frontmatter (`name`, `description`, `model`, `tools`) and names prefixed `specforge-`. The per-role `model` assignment now lives in each definition's frontmatter — `.claude/rules/model-selection.md` becomes a non-normative summary of what the frontmatter declares — and the lead dispatches by name (`subagent_type: specforge-<role>`) instead of reading and pasting a template. The `{{VARIABLE}}` substitution contract is retired; the same six (reviewer) or four/five (roadmap) fields travel as labelled lines in the dispatch prompt, and the missing-mode hard-halt (`REVIEW_MODE` / `PANEL_MODE`) is what keeps the contract enforceable without substitution. `FRAMEWORK_FILES` swaps `agents/**` for `.claude/agents/specforge/**`; the bundle stays at 33 files, `init` still writes 32.
- `.claude/rules/workflow.md` steps 5-9 are hardened against the review-loop churn a field report surfaced: a **propagation pass** (after a fix that changes a stated fact, grep the superseded token across the whole document — prose and Mermaid — before closing the finding), a **mechanism-fix adversarial bounce** (a fix that introduces new mechanism is dispatched to one reviewer to refute before it lands), a **`re-verification` review mode** with a prior-findings ledger and a moving-target freeze (`DOCUMENT_LINES` in the draft loop, `COMMIT_REF` at step 9), and a **draft-loop escalation counter** mirroring the post-implementation one.
- `effort` is now settable per role via definition frontmatter (it was inert on the old plain-markdown briefings). The framework deliberately sets none; teams may add it locally.

### Added

- `doctor` validator `subagent-frontmatter` (error severity): recursively walks `.claude/agents/**`, enforcing that definitions inside the `specforge/` namespace carry valid frontmatter with a `specforge-` name and an accepted `model` (the four aliases plus `inherit`), and that no file **outside** the namespace claims a reserved `specforge-` name — the shadowing control. The walk is symlink-aware (a shadow behind a symlinked file, directory, or the namespace root is reported, not skipped) and containment is identity-based via `realpath`, so a case-variant directory that is genuinely the same inode stays inside while a distinct one on a case-sensitive filesystem is caught.
- `doctor` validator `stale-briefings` (warning severity): flags a leftover `agents/` briefing directory coexisting with the new `.claude/agents/specforge/`, pointing at the cleanup below. Warning severity — it does not change `doctor`'s exit code.
- A "Turning the panels off" section in the READMEs: a copy-pasteable `permissions.deny` snippet for adopters who do not run the review or roadmap panels, plus the restart-once caveat for the first creation of `.claude/agents/`.

### Fixed

- `init --force --erase` routes deletions through `safeUnlink` (path-containment guard) and surfaces a refused deletion through the error printer instead of swallowing it in a best-effort catch, while still completing the install and exiting 0 per PRD-003 §5.1's frozen table.

### Cleanup for existing adopters

Nothing is deleted from your directory by this release. After running `npx @angelkurten/specforge@latest update`, the new `.claude/agents/specforge/` tree is written alongside your old `agents/` directory, and `doctor` emits the `stale-briefings` warning until you remove it.

**Should delete — not inert:** the old `agents/` directory (all 12 briefings). Unlike ordinary orphans these are LLM-readable dispatch instructions: a stale briefing without the `re-verification` mode or with the old un-prefixed dispatch semantics can be read and followed by an agent grounding in your repo, and once its manifest entry drops it is no longer integrity-checked. The live definitions are under `.claude/agents/specforge/`.

**Note:** `.claude/agents/specforge/` is framework-owned — `update` overwrites it and `init --force --erase` deletes files in it. Keep your own subagents outside it (`.claude/agents/<your-dir>/` or the `.claude/agents/` root) and do not use the reserved `specforge-` name prefix.

**Known follow-ups** ([PRD-007](007-doctor-detects-in-namespace-shadows-and-erase-exit-code.md), `Draft`): `doctor` does not yet detect a forged definition placed *inside* the namespace, and a refused erase exits 0 rather than signalling automation. `permissions.deny` is the recommended defence in the meantime.

## [0.10.0] - 2026-08-05

Shipped via [PRD-005: Stop installing specforge's own project metadata into adopters](005-stop-installing-project-metadata.md) (`Status: Implemented`; gate filled after a four-round post-implementation re-review cleared). Roadmap: [ROADMAP-004](ROADMAP.md) `Shipped`. No migration script — content-only, no layout change.

### Changed

- `init` and `update` no longer write specforge's own project metadata into an adopting team's directory. Eight entries leave `FRAMEWORK_FILES`; seven were files adopters actually received: `CHANGELOG.md`, `VERSION`, `docs/**`, `mkdocs.yml`, `requirements-docs.txt`, `.github/workflows/cli-release.yml`, and `scripts/upgrade.sh`. The eighth, `.github/workflows/specforge-ci.yml`, was a live partition rule with no file behind it. The bundle goes from 45 files to 33; `init` writes 32.
- `VERSION` moves to a new `BUNDLE_ONLY_FILES` list in `tools/cli/src/partition.ts`. It stays inside the npm tarball, because `bundleVersion()` reads `framework/VERSION` unguarded from `init`, `update` and `migrate`, but it is no longer installed. `listBundledFrameworkFiles` already filtered the bundle walk by `classify() === "framework"`, so no call site changed.
- `README.md`, `README.es.md` and the npm README lose every reference to a vacated path — the file-layout tree, the `VERSION` and `CHANGELOG.md` links, and the legacy `scripts/upgrade.sh` section. A shipped framework file pointing at a path `init` no longer writes is the same failure this release fixes.

### Fixed

- `prepublish`'s auto-run guard compared a lexically-resolved `process.argv[1]` against an ESM-realpath'd `import.meta.url`, so invoking it by an absolute path through a symlink loaded the module, failed the guard, and exited 0 having written nothing. Because `tools/cli/framework/` is gitignored, that publishes whatever stale bundle is on disk while reporting success. Both operands are realpath'd now, and the post-run check compares the bundle against the resolved file set rather than testing non-emptiness, so a copy that did not land and a stale file that survived the wipe both fail.
- `runPrepublish` accepted a partial option specification — `{ frameworkFiles: [] }` with no roots — that defaulted the bundle root to the real package and recursively deleted it, returning 0 with a wrong-but-non-empty bundle. Any explicit option now requires explicit roots, including prototype-inherited ones.

### Cleanup for existing adopters

Nothing is deleted from your directory by this release. After running `npx @angelkurten/specforge@latest update`, you may remove these from your specforge directory. Nothing in the CLI reads any of them from an install.

**Should delete — not cosmetic:**

- `.github/workflows/cli-release.yml` — live on `v*.*.*` tag push, holds `id-token: write` and an `npm publish` step against `secrets.NPM_TOKEN`. If you installed specforge as its own repository, tagging your own release triggers it.
- `scripts/upgrade.sh` — executable, no longer covered by `doctor`'s integrity check, and it applies its own partition that would reinstall the files this release removes.

**May delete — cosmetic:**

- `CHANGELOG.md`, `VERSION`, `docs/`, `mkdocs.yml`, `requirements-docs.txt`.

## [0.9.0] - 2026-08-05

### Added

- **Hard rule 14 — the step 2, 5 and 9 fan-outs are dispatched, not simulated.** `workflow.md` has always instructed the lead agent to launch parallel Explore agents, a four-reviewer panel, and an implementation team, but no invariant covered the case where the agent declines to delegate and does the work inline instead. Claude Code builds from 2026-07-24 onward ship a default that withholds automatic `Agent` dispatch until the user asks for it, which turns a four-reviewer panel into one context restating itself. Rule 14 is the standing request that satisfies that default, and it inherits the "Override immunity" preamble — no per-session instruction needed. Captions synchronised to "14 invariants" in `CLAUDE.md`, `README.md`, `README.es.md`, `docs/faq.md` and the npm README, per the caption-sync guard in `tests/roadmap/hard_rules_12_test.md`.
- README section "Reinforcing delegation on Claude Code" (both languages, plus the npm README): the optional `UserPromptSubmit` hook that restates rule 14 on every prompt, for teams that still see the lead agent skip dispatch. Deliberately **not** scaffolded by `init` and never touched by `update` — settings files are team data, not framework data, per the upgrade contract in `framework-maintenance.md`.
- Conformance coverage for rule 14 in `tools/cli/tests/conformance/framework.test.ts`: the rule appears once, names the `Agent` tool and all three fan-out steps, declares itself a standing request, and requires halting rather than silently substituting inline work.

## [0.8.0] - 2026-07-27

Three rules specforge documented but never mechanically checked are now enforced, and `doctor` passes against specforge's own repo for the first time. No migration required (`specforge update` refreshes in place).

### Fixed

- `gate-block-yaml` and `prd-system-artifact-diff` rejected the yellow-tracking comment that `.claude/rules/gate-block.md` requires above the gate block. Both read the fence through one shared module now, so PRD-002 and PRD-003 stop reporting a missing gate block.
- `roadmap-evidence-categories` matched only a bare `Evidence:` while `templates/roadmap.md` emits `**Evidence**:`, so every item written from the shipped template reported zero evidence entries. Hard rule 12's mechanical enforcement now works on real template output.

### Added

- `roadmap-pii` doctor validator implementing all eight patterns in `.claude/rules/roadmap.md` § "Forbidden evidence (syntactic)", with the § Visibility severity switch. The rule file declared itself the canonical detection surface; until now nothing implemented it.
- `.github/workflows/cli-ci.yml` runs the test suite and `specforge doctor` on push and PR. Previously tests ran only on a `v*.*.*` tag, and doctor ran nowhere.
- `prd-marketing-language` now distinguishes use from mention: a forbidden phrase wrapped in quotes or backticks is being named, not used, so a PRD documenting hard rule 9 no longer fails it. An unquoted use on the same line is still reported.
- `manifest-present` skips the specforge source repo, which is not an installation — there is no installed framework version there, the files are the source.

### Changed

- `SIBLINGS.md`: dropped the `api-service` / `web-client` placeholder rows. Their paths never resolved, so specforge's own registry failed `siblings-paths-resolve` — and by `workflow.md` step 2's halt-on-unresolved-path precondition, a session authoring a PRD inside specforge had to stop on itself. Adopters are unaffected: `specforge init` writes its own placeholder registry, and `CONVENTIONS.md` keeps the worked multi-sibling example.
- `.claude/rules/model-selection.md`: `roadmap-product-generator` and `roadmap-support-generator` move from `haiku` to `sonnet` — both briefings read `ROADMAP.md` in full plus grounding context, and Haiku's 200k window is a ceiling that work can exceed. `haiku` and `fable` now carry no default role, each with a stated reason. The `## Scope` section is rewritten: `effort` is a real frontmatter field but is not reachable from the `Agent` tool dispatch path, so briefings inherit the session level.

## [0.7.1] - 2026-07-08

Docs-only patch. No rule, template, or CLI behaviour changes; no migration required (`specforge update` refreshes in place).

### Changed

- `README.md` / `README.es.md`: new "Adoption via npx" section documenting `init` / `update` / `doctor` / `migrate` / `version`, the Node ≥20 requirement, and provenance verification via `npm audit signatures` (closes the PRD-003 § 8.1 documentation requirement).
- `README.md` / `README.es.md` "Upgrading" section now recommends `npx @angelkurten/specforge update`; `scripts/upgrade.sh` documented as deprecated (deprecation window opened by PRD-003).

## [0.7.0] - 2026-05-27

Shipped via [PRD-003: CLI for installation and lifecycle management](003-cli-for-installation-and-lifecycle.md) (`Status: Implemented`; gate filled after a post-implementation re-review cleared). Roadmap: [ROADMAP-003](ROADMAP.md) `Shipped`.

### Added

- `@angelkurten/specforge` npm package (TypeScript, Node ≥20) providing the CLI: `init`, `update`, `doctor`, `migrate`, `version`.
- Monorepo subdirectory `tools/cli/` holding the source, tests (136 passing), and CI workflow (`.github/workflows/cli-release.yml`) for `npm publish --provenance`.
- 12 doctor validators enforcing hard-rules 4, 8, 9, 10, 11, 12 plus rule-file frontmatter, gate-block YAML shape, PRD numbering monotonicity, PRD required sections, CLAUDE.md size, manifest presence, and framework-file integrity.
- `.specforge/manifest.json` schema with sha256-at-install per framework file, migration audit trail (direction up/down + script_sha256 + security_sensitive boolean).
- `.specforge/lock` advisory lockfile (mutating commands acquire; doctor/version do not).
- Migration framework with `up()` / optional `down()` + `security_sensitive?: boolean`; downgrade requires `--allow-downgrade` and sensitive rollback requires `--acknowledge-security-rollback`.
- AgDR-001 (vitest as the CLI test runner) — first AgDR emitted under the new framework.
- PRD-004 stub tracking two architectural 🟡 follow-ups deferred from PRD-003 post-impl re-review (merge base degradation; exit-3 dual-meaning documentation gap).

### Security

- Node version runtime check independent of npm `EBADENGINE` warning.
- YAML safe-load via `customTags: []` plus warning-promoted-to-fatal (single entry point at `src/yaml.ts`).
- File-overwrite safety: `--erase` requires double opt-in (`--no-git-safety` AND `SPECFORGE_ALLOW_DESTRUCTIVE=1`); `git status` invoked via `spawn` with `shell: false`, timeout 5s, fail-closed on any error.
- Path traversal + symlink safety: lexical resolve + realpath check + `O_NOFOLLOW` (`fs.open 'wx'` + `lstat` refuse-on-symlink).
- `framework-file-integrity` validator compares on-disk sha256 against the npm-attested bundled snapshot (not the user-mutable manifest) when versions match.

---

## [0.6.0] - 2026-05-26

Shipped via [PRD-002: SDD-2026 Framework Alignment](002-sdd-2026-framework-alignment.md) (`Status: Implemented`; gate filled after a post-implementation re-review cleared). Roadmap: [ROADMAP-002](ROADMAP.md) `Shipped`.

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

### Fixed
- Post-implementation re-review (PRD-002 step 9) closed two 🟡 fix-in-code: `README.es.md` was missing the `agdr.md` template-list entry (added); `tests/sdd-2026/override_immunity_test.md` did not assert the non-exhaustiveness property of the override-immunity preamble (pass-criterion + fail-example added). `tests/sdd-2026/hard_rules_13_test.md` also gained a check for the partial/bidirectional clause.

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
