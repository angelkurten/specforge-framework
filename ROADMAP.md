# Roadmap

**Last rotated**: 2026-04-19
**Stale threshold**: 6 months
**Visibility**: public

<!-- See .claude/rules/roadmap.md for the cycle, evidence categories, and discipline. -->

## Stale items

<!-- Auto-computed: items with last_reviewed older than Stale threshold. None yet. -->

## Themes

<!-- None yet. -->

## Items

### ROADMAP-001: Introduce the roadmap cycle

**Status**: Shipped
**Horizon**: —
**Theme**: —
**Last reviewed**: 2026-04-19
**PRD**: PRD-001

**Problem / outcome**: specforge lacks a living product-level artifact connecting strategic intent and evidence to individual PRDs, leaving the collection of decisions without a traceable why.
**User**: specforge maintainers and adopting teams
**Siblings likely impacted**: specforge

**Evidence**:
- [PRD-001] — retroactive meta-reference per `.claude/rules/roadmap.md` § Evidence category 7

**Caveats**: —

### ROADMAP-002: SDD-2026 framework alignment

**Status**: Shipped
**Last reviewed**: 2026-05-26
**Theme**: —
**PRD**: PRD-002

**Problem / outcome**: specforge predated the 2026 consolidation of spec-driven-development practice; five low-risk gaps (no decision-table lower bound, no stated rule precedence, no testable reactive-goal phrasing, no spec-as-source prohibition, no agent-decision traceability) were closed.
**User**: specforge maintainers and adopting teams
**Siblings likely impacted**: specforge

**Evidence**:
- [PRD-002] — retroactive meta-reference per `.claude/rules/roadmap.md` § Evidence category 7

**Caveats**: —

### ROADMAP-003: CLI for installation and lifecycle management

**Status**: Shipped
**Last reviewed**: 2026-05-27
**Theme**: —
**PRD**: PRD-003

**Problem / outcome**: adopting specforge required `git clone` + manual file copying with no programmatic surface for validation, migration, or lifecycle. The `@angelkurten/specforge` npm CLI now provides `init`/`update`/`doctor`/`migrate`/`version` with manifest-based drift detection, lockfile concurrency safety, 12 hard-rule validators, and path-traversal + symlink guards.
**User**: specforge maintainers and adopting teams
**Siblings likely impacted**: specforge

**Evidence**:
- [PRD-003] — retroactive meta-reference per `.claude/rules/roadmap.md` § Evidence category 7

**Caveats**: Two 🟡 architectural follow-ups tracked in PRD-004 (merge base degradation; exit-3 git-unavailable documentation gap).
