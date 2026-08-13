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

### ROADMAP-004: Stop installing specforge's own project metadata into adopters

**Status**: Shipped
**Last reviewed**: 2026-08-05
**Theme**: —
**PRD**: PRD-005

**Problem / outcome**: `init` and `update` wrote specforge's own project metadata into every adopting team's directory — release history, documentation-site sources, a legacy shell upgrader, and the workflow that publishes specforge to npm. Coding agents working in an adopter's repository read the installed `CHANGELOG.md` as that team's own release history, and a team that installed specforge as its own repository carried a live `id-token: write` publish workflow triggered by their own version tags. The CLI now installs only the nine paths a team consumes; `VERSION` stays in the npm tarball for the CLI's own version resolution but is no longer written to disk. Already-installed copies are left in place and inert, with a cleanup list in the 0.10.0 release notes.
**User**: adopting teams, and the coding agents working in their repositories
**Siblings likely impacted**: specforge

**Evidence**:
- [PRD-005] — retroactive meta-reference per `.claude/rules/roadmap.md` § Evidence category 7

**Caveats**: Existing installs are not cleaned up automatically. Automatic deletion was designed and rejected — see PRD-005 § 3; it required building the CLI's first destructive operation, and the review panel found four ordering and idempotency defects plus six security ones in that design.

### ROADMAP-005: Subagent briefings and review-loop hardening

**Status**: Shipped
**Last reviewed**: 2026-08-09
**Theme**: —
**PRD**: PRD-006

**Problem / outcome**: the 12 reviewer/generator/critic briefings were plain-markdown paste templates whose per-role model assignment and dispatch mode depended on lead-agent discipline with nothing enforcing them, and the review loop converged slowly — a field report from an adopting team showed a seven-round cycle whose dominant costs were fix-propagation failures and reviewer-proposed fixes applied as patches. The briefings are now Claude Code subagent definitions under `.claude/agents/specforge/` (model/tools in frontmatter, reserved `specforge-` prefix enforced by a `subagent-frontmatter` validator), and `workflow.md` gained the propagation pass, the mechanism-fix adversarial bounce, re-verification mode with a prior-findings ledger and moving-target freeze, and a draft-loop escalation counter.
**User**: specforge maintainers and adopting teams
**Siblings likely impacted**: specforge

**Evidence**:
- [PRD-006] — retroactive meta-reference per `.claude/rules/roadmap.md` § Evidence category 7

### ROADMAP-006: Web access for the review subagents

**Status**: Shipped
**Last reviewed**: 2026-08-10
**Theme**: —
**PRD**: PRD-008

**Problem / outcome**: the 4 reviewer subagents shipped by PRD-006 could only ground in the dispatch prompt and on-disk files, with no way to check a dependency's current changelog or a live CVE advisory while reviewing. The 4 reviewers now carry `WebFetch` (not `WebSearch` — deferred pending documentation of its result shape and injection surface), with a new body clause stating fetched content must never be used to construct or justify a `Bash` invocation — closing the chain where a hostile diff names an attacker-controlled fetch target in post-implementation review. Originally drafted as a single PRD granting all 12 subagents web access; the step-5 security review found the roadmap panel's half unsafe as drafted (unfenced generator output, pre-fetch screening only in one of eight bodies, no findings channel for generators, clause scope gaps) and the panel split — the roadmap panel's grant moved to the PRD-009 stub.
**User**: specforge maintainers and adopting teams
**Siblings likely impacted**: specforge

**Evidence**:
- [PRD-008] — retroactive meta-reference per `.claude/rules/roadmap.md` § Evidence category 7

**Caveats**: `WebSearch` is deferred framework-wide (§3) pending clearer Claude Code documentation of its result shape. The `.claude/settings.json` domain-scoping example's `allow`+`deny` precedence is documented as unverified, not as a proven restriction. The roadmap panel's web access is tracked separately in PRD-009 (`Draft`), seeded with the four structural gaps found in review.

**Caveats**: Two 🟡 follow-ups tracked in PRD-007 (in-namespace forgery detection; an exit code for incomplete erase). The shadowing control is repo-scoped and detective (runs on `doctor`), not dispatch-time; `permissions.deny` is the recommended defence for adopters who do not run the panels.

### ROADMAP-007: Implementer subagent roles for the implementation step

**Status**: Shipped
**Last reviewed**: 2026-08-13
**Theme**: —
**PRD**: PRD-010

**Problem / outcome**: the review step dispatched four named subagent definitions with an enforced brief, a mode-halt contract and a prompt-injection clause, while the implementation step selected sub-agents ad-hoc per sibling stack with no fixed contract at all — so nothing stopped a dispatch omitting the "read the sibling's `CLAUDE.md` first" step every reviewer makes mandatory, an ad-hoc agent's system prompt carried no guaranteed data-not-instructions clause despite holding `Edit`/`Write`/`Bash`, and no persona-level checklist existed on the implementer side. Two definitions now ship — `specforge-backend-implementer` and `specforge-frontend-implementer` — with a six-field brief, an `IMPL_MODE` halt clause, a `fix-round` mode carrying a findings ledger, a write exclusion covering `.claude/agents/**` and frozen PRDs/ADRs, and an instruction to actually exercise `Bash` on the sibling's own runners before reporting, with each command's real result. The last of those closed a gap where a granted tool that no step told the agent to use would simply go unused: the implementer would have written the Test Plan's tests and never executed them.
**User**: specforge maintainers and adopting teams
**Siblings likely impacted**: specforge

**Evidence**:
- [PRD-010] — retroactive meta-reference per `.claude/rules/roadmap.md` § Evidence category 7

**Caveats**: four 🟡 follow-ups tracked in PRD-011 (`Draft`) — PRD-010 §8 describes the superseded circular version of the `Bash` scope rule at one site and a stricter-than-shipped version at another, its provenance clause is qualified by a carve-out added later, and its write boundary does not name specforge's own `.claude/agents/**` when `SIBLING_ROOT` is another repo. All are divergences between the frozen PRD's account and the shipped artifacts, not defects in the artifacts. The write exclusion is instruction-level prose, not a capability-level control; there is no per-subagent path enforcement. Adopters maintaining a `permissions.deny` list must hand-append both new identities, since `.claude/settings.json` is outside the partition and `update` never touches it.
