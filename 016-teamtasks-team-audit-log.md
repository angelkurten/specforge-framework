# PRD-016: teamtasks team audit log

**Status**: Draft
**Date**: 2026-10-25
**Author**: AI-assisted
**Priority**: P2
**Depends on**: PRD-015
**Supersedes**: None

> **Stub.** Created when logging was cut from [PRD-015](015-teamtasks-teams-and-membership.md) at its step 6 escalation. Not yet grounded, drafted or reviewed; every section below is a placeholder until it is.

## Impacted Projects

| Project | Impact |
|---------|--------|
| **teamtasks** | A logger for team events and refusals, its handler, and the probing signal PRD-015 could not provide [TBD] |

---

## 1. Problem Statement

PRD-015 ships teams and membership with two accepted risks (an email oracle on add-member, membership without consent) and no log, so neither can be watched. [TBD]

Measured during PRD-015's mechanism bounces, for whoever drafts this — inputs, not decisions:

- a `teamtasks` logger's `INFO` lines are dropped unless the app attaches a handler; uvicorn configures only its own loggers and writes to stderr;
- a handler bound to `sys.stderr` at import time writes to pytest's capture file, so a `capfd` test fails against a correct build; `sys.__stderr__` does not;
- logging `scope["path"]` or `request.url.path` lets an unauthenticated caller inject log lines (`%0A`, U+2028); the route template `scope["route"].path` does not, and a global exception handler must not assume `scope["route"]` exists;
- a test counting `caplog.records` or splitting on `\n` passes against both broken versions; count `str.splitlines()` over the rendered output.

## 2. Goals

- [TBD]

## 3. Non-Goals

- [TBD]

## 4. User Flows / Design

[TBD]

## Frontend Spec

No design exists: [TBD].

## 5. API

[TBD]

## 6. Data Model

[TBD]

## 7. Architecture

[TBD]

## 8. Security

[TBD]

## 9. Test Plan

| # | Test | Type | Description | Path |
|---|------|------|-------------|------|
| 1 | [TBD] | [TBD] | | [TBD] |

## 10. Migration Plan

[TBD]

## Observability

[TBD]

## 11. Open Questions

- [ ] Ground and draft this PRD. Owned by the lead, after PRD-015 ships.

---

## Gate: Promotion to Implemented

```yaml
commit_hash: [TBD]
tests:
  - [TBD]
system_artifact_diff:
  - [TBD]
```
