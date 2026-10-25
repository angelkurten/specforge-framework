# PRD-018: teamtasks task CSV export

**Status**: Draft
**Date**: 2026-10-25
**Author**: AI-assisted
**Priority**: P2
**Depends on**: PRD-017
**Supersedes**: None

> **Pilot note.** Change 8 of the specforge v2 pilot, built with the v1 workflow. It is the first change that puts personal data — member emails — into a file that leaves the app.

## Impacted Projects

| Project | Impact |
|---------|--------|
| **teamtasks** | New endpoint `GET /teams/{team_id}/tasks.csv` (new): a team's tasks as CSV, with the list route's filters, member emails only, formula-safe cells, a 10,000-row cap; `docs/SYSTEM_ARTIFACT.md` tasks domain |

---

## 1. Problem Statement

A member can list a team's tasks as JSON (`../specforge-pilot/teamtasks/app.py:451-472`) but cannot take them into a spreadsheet, which is where status reviews and planning happen. There is no usage evidence; the pilot backlog orders this change eighth.

What is established: task titles are user text that nothing stops from starting with `=`, `+`, `-` or `@` (`../specforge-pilot/teamtasks/app.py:92-95`, `:105-109`), which spreadsheet apps run as formulas; every Session holds the database lock from begin to close (`../specforge-pilot/teamtasks/app.py:207-216`); and `tasks.created_by` keeps the id of a creator who has left the team (`../specforge-pilot/teamtasks/app.py:373-374`), whose email no route shows today. What is assumed: 10,000 rows is enough for one team's export.

## 2. Goals

- When a member requests `GET /teams/{team_id}/tasks.csv`, the system shall return that team's tasks as a CSV file, filtered by the same `q`, `status` and `assignee_id` as the list route, in id order.
- When an assignee or a creator is a current member of the team, the system shall show their email; otherwise the email cell shall be empty and only the id shown.
- If a cell would start with `=`, `+`, `-`, `@`, a tab or a carriage return, then the system shall prefix it with `'` so a spreadsheet shows it as text.
- If more than 10,000 tasks match, then the system shall answer 413 and write no file.
- The system shall read the rows in one short Session and build the file after the Session closes, so the database lock is never held while the file is built or sent.

**Appetite**: under 100 lines of product code, no new dependency, one implementation round.

## 3. Non-Goals

- **Other formats** (XLSX, JSON download). CSV only.
- **Streaming arbitrarily large exports.** The 10,000-row cap bounds memory and lock time instead.
- **Logging who exported what.** [PRD-016](016-teamtasks-team-audit-log.md) owns team logging.
- **Emails of people who are no longer members.** Decided by the human: such cells are empty.

## 4. User Flows / Design

1. The actor is a logged-in member; they call the route with a bearer token and get a file download.
2. The response is built in one request; reading 10,000 rows takes well under the 5 s busy timeout other requests wait under.
3. Success is a `200` with `Content-Type: text/csv; charset=utf-8` and `Content-Disposition: attachment; filename="team-<team_id>-tasks.csv"`.
4. No design exists; this PRD adds no user interface.

```mermaid
sequenceDiagram
    participant M as Member
    participant API as teamtasks
    participant DB as SQLite

    M->>API: GET /teams/1/tasks.csv?status=todo
    API->>DB: Session: COUNT matching tasks; SELECT tasks LEFT JOIN current members' emails; close
    API->>API: build CSV in memory, prefix formula-leading cells
    API-->>M: 200 text/csv, attachment
```

### 4.1 Happy path

1. A member calls `GET /teams/{team_id}/tasks.csv`, optionally with `q`, `status` and `assignee_id`.
2. The route reads the matching rows and closes its Session.
3. It writes a header row and one row per task, and returns the file.

### 4.2 Error branches

| # | Branch | Status | Body |
|---|--------|--------|------|
| 1 | No or unknown token | 401 | `{"detail": "invalid token"}` |
| 2 | `team_id` not an integer or out of range | 422 | validation error |
| 3 | Caller not a member, or no such team | 404 | `{"detail": "team not found"}` |
| 4 | A filter value out of range (`status` unknown, `assignee_id` out of 1..2^63-1, `q` empty or over 200) | 422 | validation error |
| 5 | More than 10,000 tasks match | 413 | `{"detail": "export too large; narrow it with q, status or assignee_id"}` |
| 6 | No task matches | 200 | the header row only |
| 7 | The caller is removed between `team_membership` and the read | 200 | one more read, the accepted debt for reads (`SYSTEM_ARTIFACT.md`, teams Open Debt) |
| 8 | The database lock is not acquired within 5 s | 500 | FastAPI's default |

## Frontend Spec

No design exists: this PRD adds no user-visible screen; the surface is a file download from the JSON API.

## 5. API

### 5.1 `GET /teams/{team_id}/tasks.csv` (new)

**Auth**: any member, through `team_membership` (`../specforge-pilot/teamtasks/app.py:281-288`). The path is `tasks.csv`, not `tasks/export`, because `/teams/{team_id}/tasks/{task_id}` would match `export` first and answer 422.

**Query**: `q`, `status`, `assignee_id`, with the bounds of the list route (`../specforge-pilot/teamtasks/app.py:455-459`). `limit` and `offset` are not accepted.

**Order of checks**: 401 → 422 `team_id` → 404 team not found → 422 query → 413 too large → 200.

**Response 200**: `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="team-<team_id>-tasks.csv"`, `Cache-Control: no-store`. Body: RFC 4180 CSV from the standard library's `csv` module, a header row `id,title,status,assignee_id,assignee_email,created_by,creator_email`, then one row per task in id order.

**Cells**: `assignee_email` and `creator_email` are the user's email only when that user is currently a member of the team, else empty; the ids are always shown. Every text cell — `title` and both emails — that starts with `=`, `+`, `-`, `@`, `\t` or `\r` is prefixed with `'`.

**Errors**: 401 `invalid token`; 404 `team not found`; 413 `export too large; narrow it with q, status or assignee_id`; 422 validation error.

## 6. Data Model

No schema change. The route reads `tasks` (`../specforge-pilot/teamtasks/app.py:77-86`), `users` (`../specforge-pilot/teamtasks/app.py:40-46`) and `memberships`; an email is joined only through a `memberships` row for the same `team_id`.

## 7. Architecture

One route in the FastAPI app.

- The filter-building part of `list_tasks` (`../specforge-pilot/teamtasks/app.py:461-470`) is shared with the export through `task_filters` (new), so the two cannot diverge.
- One Session runs `SELECT COUNT(*)` on the filtered query and, under the cap, a `SELECT` of the tasks with two `LEFT OUTER JOIN`s — `memberships` then `users` — for the assignee and the creator; the rows are copied into plain tuples and the Session closes. The CSV is then written into an `io.StringIO` and returned as a `Response`. No Session is open while the file is built or sent.
- `csv_cell` (new) applies the formula prefix; it is the only path a text cell takes into the writer.

**Rejected**: `StreamingResponse` from an open Session — it would hold the database lock, which every request takes, for the whole download. **Rejected**: streaming without a cap from batched Sessions — unbounded memory and lock churn for a feature with no evidence of large teams. **Rejected**: stripping formula characters — it changes the user's text; the prefix keeps it visible.

## 8. Security

| # | Threat | Mitigation | Enforced at |
|---|--------|------------|-------------|
| 1 | A non-member downloads a team's tasks | `team_membership` answers 404 before any read | §5.1 |
| 2 | Formula injection: a title or email starting with `=`, `+`, `-`, `@`, tab or CR runs in a spreadsheet | `csv_cell` (new) prefixes `'`; the `csv` module quotes commas, quotes and newlines | §5.1, §7 |
| 3 | The export reveals emails of people no longer in the team | an email is joined only through a current `memberships` row of the same team; otherwise the cell is empty (decided by the human, 2026-10-25) | §5.1, §6 |
| 4 | A cached copy of a PII file | `Cache-Control: no-store` | §5.1 |
| 5 | Holding the database lock, or memory, with a huge export | 10,000-row cap checked by `COUNT` before the read; the file is built after the Session closes | §7 |
| 6 | Inherited: members see each other's emails without consent (PRD-015 §8 row 7, carried by PRD-017); a removed member gets one more read | unchanged; the CSV makes the first portable | — |

**Secrets**: none. **PII**: emails of current members of the caller's team, in a file the caller keeps.

## 9. Test Plan

| # | Test | Type | Description | Path |
|---|------|------|-------------|------|
| 1 | a member downloads the team's tasks as CSV | integration | 200; `text/csv; charset=utf-8`; `attachment; filename="team-<id>-tasks.csv"`; `no-store`; the header row; one row per task in id order, parsed back with `csv.reader`. | `../specforge-pilot/tests/test_tasks_export.py` |
| 2 | the export honours `q`, `status` and `assignee_id` like the list route | integration | For each filter, the CSV's ids equal the list route's ids for the same filter. | `../specforge-pilot/tests/test_tasks_export.py` |
| 3 | a non-member gets 404, identical to a missing team; no token gets 401 | integration | | `../specforge-pilot/tests/test_tasks_export.py` |
| 4 | bad filter values and an out-of-range team id are 422 | integration | | `../specforge-pilot/tests/test_tasks_export.py` |
| 5 | emails appear only for current members | integration | A task created by dee, who is then removed from the team, and assigned to ben: ben's email is present, dee's cell is empty and dee's id is present. Fails against a join to `users` that skips `memberships`. | `../specforge-pilot/tests/test_tasks_export.py` |
| 6 | formula-leading cells are prefixed | integration | Titles `=1+1`, `+cmd`, `-2`, `@SUM(A1)` come back as `'=1+1`, `'+cmd`, `'-2`, `'@SUM(A1)`; a title `a=b` is unchanged; an email starting with `-` is prefixed. Fails against writing the title as is. | `../specforge-pilot/tests/test_tasks_export.py` |
| 7 | commas, quotes and non-ASCII survive a round trip | integration | Titles `a, b`, `say "hi"` and `café` parse back unchanged with `csv.reader`. | `../specforge-pilot/tests/test_tasks_export.py` |
| 8 | no match is the header row only | integration | | `../specforge-pilot/tests/test_tasks_export.py` |
| 9 | over 10,000 matching tasks is 413 | integration | 10,001 tasks inserted with raw sqlite3; 413 with the message; with a filter that matches 10,000 or fewer, 200. Fails against an export without the cap. | `../specforge-pilot/tests/test_tasks_export.py` |
| 10 | the export does not hold the lock while building the file | integration | A one-shot wrapper on `csv_cell` that, on its first call, opens a raw sqlite3 connection with a 0.2 s timeout and writes a row to another team; the write succeeds. Fails against building the CSV inside the read Session. | `../specforge-pilot/tests/test_tasks_export.py` |
| 11 | the path does not collide with the task route | integration | `GET /teams/{id}/tasks/7` still returns task 7; `GET /teams/{id}/tasks.csv` is the export. | `../specforge-pilot/tests/test_tasks_export.py` |

## 10. Migration Plan

No schema change and no migration. Deploying the commit adds the route; rolling back is deploying the previous commit. No flag: the route is new and unused until called.

## Observability

No new log line; [PRD-016](016-teamtasks-team-audit-log.md) owns team logging. uvicorn's access log on stdout records each export request with its status, so a burst of `413`s or `500`s on `tasks.csv` is visible there by hand. Who exported which team's data is not recorded — the same gap PRD-016 owns for every team action.

## 11. Open Questions

- [ ] Exports are unaudited until PRD-016. Cost: a PII file can leave the app without a trace. Owned by PRD-016.
- [ ] The 10,000-row cap is a guess with no usage data. Cost: a large team cannot export everything at once. Revisit with real data.

## Clarifications

- 2026-10-25 — What does the CSV show for an assignee or creator who is no longer a member? → §2, §5.1, §8 row 3.

---

## Gate: Promotion to Implemented

```yaml
commit_hash: [TBD]
tests:
  - [TBD]
system_artifact_diff:
  - [TBD]
```
