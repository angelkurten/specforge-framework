# PRD-004: CLI follow-ups from PRD-003 post-implementation re-review

**Status**: Draft
**Date**: 2026-05-27
**Author**: AI-assisted
**Priority**: P3
**Depends on**: PRD-003
**Supersedes**: PRD-003 (partial — only the specific 🟡 routings tracked in § *Tracked 🟡 findings* below; PRD-003's frozen contract otherwise stands)

> **Note**: This is a stub PRD that exists to track 🟡 findings deferred from
> the PRD-003 post-implementation re-review (per `gate-block.md` §
> "🟡 closure requires a concrete artifact"). It is not a full design —
> § 1 … § 11 carry placeholders; the load-bearing section is
> § *Tracked 🟡 findings from PRD-003 post-impl re-review*.
>
> The `Supersedes: PRD-003 (partial)` form honours the literal gate-block.md
> rule ("follow-up PRD with `Supersedes: PRD-N` in its header") while
> preserving the truth that PRD-003's overall contract is not replaced —
> only the surfaces enumerated in § *Tracked 🟡 findings* are.

## Impacted Projects

| Project | Impact |
|---------|--------|
| **specforge** | Documentation refinements and behavioural enhancements deferred from PRD-003 post-implementation re-review. |

---

## Tracked 🟡 findings from PRD-003 post-impl re-review

### § A. Merge base degradation (Backend 🟡-2)

PRD-003 § 5.2 specifies `update --strategy=merge` as a three-way merge between
the bundled file (theirs), the local file (ours), and the install-time bytes
(base). PRD-003 § 6.1 deliberately stores only `sha256_at_install` for each
framework file — not the original bytes. The implementation therefore
substitutes the bundled bytes for `base`, degrading the three-way merge to a
two-way overlay. Consequence: when only `ours` differs from `base`/`theirs`,
diff3 applies ours cleanly and never emits conflict markers. A user edit on
the same line that the bundle has also modified will be silently overwritten
by ours rather than flagged as a conflict.

Future direction (to be specified in this PRD when it advances past stub):

1. Optionally cache install-time bytes in `.specforge/installed-cache/` keyed
   by `sha256_at_install`, restoring true three-way merge semantics.
2. OR redefine `--strategy=merge` to a documented two-way overlay and rename
   the flag accordingly (`--strategy=overlay-ours` or similar) so users do not
   carry the diff3 mental model into a context where it does not hold.

### § B. Exit 3 covers fail-closed git unavailability (Backend 🟡-5)

PRD-003 § 5.1's exit-code table documents exit 3 as "dirty git tree without
double opt-in". The implementation also returns exit 3 when git is unavailable
(binary missing, timeout, signal — see PRD-003 § 8.3 fail-closed semantics).
This is consistent with § 8.3's intent but the § 5.1 table does not document
the second case explicitly, leaving the exit-code surface under-specified.

Future direction (to be specified in this PRD when it advances past stub):

1. Allocate a distinct exit code (e.g. 6) for git-unavailability, OR
2. Refine the exit-3 description in § 5.1 to enumerate both fail-closed cases
   and the message shape for each.

---

## 1. Problem Statement

Placeholder — see § *Tracked 🟡 findings from PRD-003 post-impl re-review* above.

## 2. Goals

Placeholder.

## 3. Non-Goals

Placeholder.

## 4. User Flows

Placeholder — no user-visible flows in stub form.

## 5. API

Placeholder.

## 6. Data Model

Placeholder.

## 7. Architecture

Placeholder.

## 8. Security

Placeholder. No new security surface introduced by this stub.

## 9. Test Plan

| # | Test | Type | Description | Path |
|---|------|------|-------------|------|
| 1 | Placeholder | unit | To be filled in when this PRD advances past stub. | TBD |

## 10. Migration Plan

Placeholder. This stub introduces no behavioural change.

## 11. Open Questions

- [ ] Choose direction for § A: cache install-time bytes vs. rename flag.
- [ ] Choose direction for § B: new exit code vs. refined § 5.1 prose.

---

## Gate: Promotion to Implemented

```yaml
commit_hash: [TBD]
tests:
  - [TBD]
system_artifact_diff:
  - [TBD]
```
