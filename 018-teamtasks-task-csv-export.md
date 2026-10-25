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
- If a text cell, or any `;`-separated segment of it, would start — after leading spaces and double quotes — with `=`, `+`, `-`, `@`, a tab, a carriage return, a line feed, `＝`, `＋`, `－` or `＠`, then the system shall prefix that segment with `'` so a spreadsheet splitting on `,` or `;` shows it as text.
- If more than 10,000 tasks match, then the system shall answer 422 and write no file.
- The system shall read the rows in one short Session and build the file after the Session closes, so the database lock is never held while the file is built or sent.

**Appetite**: under 100 lines of product code, no new dependency, one implementation round.

## 3. Non-Goals

- **Other formats** (XLSX, JSON download). CSV only.
- **Streaming arbitrarily large exports.** The 10,000-row cap bounds memory and lock time instead.
- **Logging who exported what.** [PRD-016](016-teamtasks-team-audit-log.md) owns team logging.
- **Emails of people who are no longer members.** Decided by the human: such cells are empty.

## 4. User Flows / Design

1. The actor is a logged-in member; they call the route with a bearer token and get a file download.
2. The response is built in one request. For 10,000 rows the read Session holds the database lock for 0.007 s and the whole response takes 0.055 s (draft-review prototypes, 2026-10-25), against the 5 s busy timeout other requests wait under.
3. Success is a `200` with `Content-Type: text/csv; charset=utf-8` and `Content-Disposition: attachment; filename="team-<team_id>-tasks.csv"`.
4. No design exists; this PRD adds no user interface.

```mermaid
sequenceDiagram
    participant M as Member
    participant API as teamtasks
    participant DB as SQLite

    M->>API: GET /teams/1/tasks.csv?status=todo
    API->>DB: current_user, then team_membership (401 / 404 before any read)
    API->>DB: Session: COUNT matching tasks
    alt COUNT > 10000
        API-->>M: 422 export too large
    else COUNT <= 10000
        API->>DB: SELECT tasks with current members' emails; close Session
        API->>API: build CSV in memory through csv_cell
        API-->>M: 200 text/csv, attachment
    end
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
| 5 | More than 10,000 tasks match | 422 | `{"detail": "export too large; narrow it with q, status or assignee_id"}` |
| 6 | No task matches | 200 | the header row only |
| 7 | The caller is removed between `team_membership` and the read | 200 | one more read, the accepted debt for reads (`SYSTEM_ARTIFACT.md`, teams Open Debt) |
| 8 | The database lock is not acquired within 5 s | 500 | FastAPI's default |

## Frontend Spec

No design exists: this PRD adds no user-visible screen; the surface is a file download from the JSON API.

## 5. API

### 5.1 `GET /teams/{team_id}/tasks.csv` (new)

**Auth**: any member, through `team_membership` (`../specforge-pilot/teamtasks/app.py:281-288`). The path is `tasks.csv`, not `tasks/export`, because `/teams/{team_id}/tasks/{task_id}` would match `export` first and answer 422.

**Query**: `q`, `status`, `assignee_id`, with the bounds of the list route (`../specforge-pilot/teamtasks/app.py:455-459`). `limit` and `offset` are not declared: FastAPI ignores undeclared query parameters, so they never page the export.

**Order of checks**: 401 → 422 `team_id` → 404 team not found → 422 query → 422 too large → 200. 422 rather than RFC 9110's content-too-large status (§15.5.14), which concerns the request content; here the query is what is too broad.

**Response 200**: `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="team-<team_id>-tasks.csv"`, `Cache-Control: no-store`. Body: RFC 4180 CSV from the standard library's `csv` module, a header row `id,title,status,assignee_id,assignee_email,created_by,creator_email`, then one row per task in id order.

**Cells**: `assignee_email` and `creator_email` are the user's email only when that user is currently a member of the team, else empty; the ids are always shown. Every text cell — `title` and both emails — goes through `csv_cell`: it splits the cell on `;`, and prefixes `'` to each segment that, with leading ASCII spaces and `"` removed (`segment.lstrip(' "')`), starts with one of `=`, `+`, `-`, `@`, `\t`, `\r`, `\n`, `＝`, `＋`, `－`, `＠`, then rejoins with `;`. Examples: `=1+1` → `'=1+1`; `x;=1+1;` → `x;'=1+1;`; `a; -2` → `a;' -2`; `a=b` and `a;b` unchanged. The prefix is visible text, not a hidden marker: a mid-cell `'` shows in every reader, which is the price of closing semicolon-locale spreadsheets (decided by the human, 2026-10-25).

**Errors**: 401 `invalid token`; 404 `team not found`; 422 `export too large; narrow it with q, status or assignee_id`; 422 validation error.

## 6. Data Model

No schema change. The route reads `tasks` (`../specforge-pilot/teamtasks/app.py:77-86`), `users` (`../specforge-pilot/teamtasks/app.py:40-46`) and `memberships` (`../specforge-pilot/teamtasks/app.py:64-74`, primary key `(team_id, user_id)`); an email is joined only through a `memberships` row for the same `team_id`, so each task yields exactly one row.

## 7. Architecture

One route in the FastAPI app.

- The filter-building part of `list_tasks` (`../specforge-pilot/teamtasks/app.py:461-470`) is shared with the export through `task_filters` (new), which returns only the `WHERE` clauses, and the two routes declare the same query parameters with the same bounds, so they cannot diverge.
- One Session runs `SELECT COUNT(*)` on the filtered query and, under the cap, a `SELECT` of the tasks with four aliased `LEFT OUTER JOIN`s (`sqlalchemy.orm.aliased`): `memberships ma ON ma.team_id = tasks.team_id AND ma.user_id = tasks.assignee_id`, `users ua ON ua.id = ma.user_id`, `memberships mc ON mc.team_id = tasks.team_id AND mc.user_id = tasks.created_by`, `users uc ON uc.id = mc.user_id`, selecting `ua.email` and `uc.email`. `COUNT` and `SELECT` apply the same `task_filters` clauses; the rows are copied into plain tuples and the Session closes. The CSV is then written into an `io.StringIO` and returned as a `Response`. No Session is open while the file is built or sent.
- `csv_cell` (new), a module-level function in `teamtasks/app.py`, applies the formula prefix; it is the only path a text cell takes into the writer, which keeps the standard library's default quoting.

**Rejected**: `StreamingResponse` from an open Session — it would hold the database lock, which every request takes, for the whole download. **Rejected**: streaming without a cap from batched Sessions — unbounded memory and lock churn for a feature with no evidence of large teams. **Rejected**: stripping formula characters — it changes the user's text; the prefix keeps it visible.

## 8. Security

| # | Threat | Mitigation | Enforced at |
|---|--------|------------|-------------|
| 1 | A non-member downloads a team's tasks | `team_membership` answers 404 before any read | §5.1 |
| 2 | Formula injection: a title or email whose cell, or whose `;`-separated segment, starts with a formula character runs in a spreadsheet that splits on `,` or `;` | `csv_cell` (new) prefixes `'` per `;` segment after stripping leading spaces and `"`, over the OWASP trigger set including LF and the full-width forms; the `csv` module quotes commas, quotes and newlines. Out of scope: a separator the user picks in an import dialog (space, `\|`); verified in LibreOffice 26.2 with `;`, not in Excel | §5.1, §7 |
| 3 | The export reveals emails of people no longer in the team | an email is joined only through a `memberships` row matching both `team_id = tasks.team_id` and the user id, in the `ON` clause; otherwise the cell is empty (decided by the human, 2026-10-25) | §5.1, §6 |
| 4 | A cached copy of a PII file | `Cache-Control: no-store` | §5.1 |
| 5 | Holding the database lock, or memory, with a huge export | 10,000-row cap checked by `COUNT` before the read; the file is built after the Session closes | §7 |
| 6 | Inherited: members see each other's emails without consent (PRD-015 §8 row 7, carried by PRD-017); a removed member gets one more read; the registration pattern accepts bidi and control characters in emails (`SYSTEM_ARTIFACT.md`, auth Open Debt) | unchanged; the CSV makes all three portable. The read race stays accepted debt like the list route's, so that every read route decides membership the same way | — |

**Secrets**: none. **PII**: emails of current members of the caller's team, in a file the caller keeps.

## 9. Test Plan

| # | Test | Type | Description | Path |
|---|------|------|-------------|------|
| 1 | a member downloads the team's tasks as CSV | integration | 200; `text/csv; charset=utf-8`; `attachment; filename="team-<id>-tasks.csv"`; `no-store`; the header row; one row per task in id order, parsed back with `csv.reader`. | `../specforge-pilot/tests/test_tasks_export.py` |
| 2 | the export honours `q`, `status` and `assignee_id` like the list route | integration | For each filter alone, for `q` with `status` and `assignee_id` combined, and for `q=50%` and `q=a_b` against titles `50% done`, `500 rows`, `a_b`, `axb`, the CSV's ids equal the list route's ids for the same parameters. Fails against an export that rebuilds the filters without escaping or skips one. | `../specforge-pilot/tests/test_tasks_export.py` |
| 3 | a non-member gets 404, identical to a missing team, before any other refusal; no token gets 401 | integration | No token → 401 `invalid token`. A non-member → 404 `team not found`, the same status and body as a missing team id; the same non-member with `status=blocked` → 404, not 422; the same non-member on a team with 10,001 tasks → 404, not 422. Fails against an export that validates the query or counts before `team_membership`. | `../specforge-pilot/tests/test_tasks_export.py` |
| 4 | bad filter values and an out-of-range team id are 422 | integration | As a member: `status=blocked`, `assignee_id` of `0`, `2**63` and `x`, `q` of `""` and 201 characters, and team id `2**63` are each 422 with FastAPI's validation body, not `text/csv`. | `../specforge-pilot/tests/test_tasks_export.py` |
| 5 | emails appear only for current members | integration | dee, a member of teams A and B, creates a task in A assigned to ben, who is also in both; dee is removed from A. The export of A has exactly as many data rows as A has tasks; ben's email is present, `creator_email` is empty and dee's id is present. Fails against a join without `team_id` (dee's B membership leaks her email and ben's duplicates rows), a join to `users` by `created_by`, an `INNER` join, and the `team_id` condition moved from `ON` to `WHERE`. | `../specforge-pilot/tests/test_tasks_export.py` |
| 6 | formula-leading cells are prefixed | integration | Titles `=1+1`, `+cmd`, `-2`, `@SUM(A1)`, `＝1+1` come back as `'=1+1`, `'+cmd`, `'-2`, `'@SUM(A1)`, `'＝1+1`; `x;=1+1;` comes back as `x;'=1+1;`; `x;"=1+1;` gives a raw body containing `;'""=1+1`; `a; -2` round-trips as `a;' -2`; `a=b` and `a;b` are unchanged; a user registered as `-x@e.co`, as both assignee and creator, gives `'-x@e.co` in `assignee_email` and `creator_email`. Fails against a first-character-only rule, against a rule that skips the quote strip, and against writing the cell as is. | `../specforge-pilot/tests/test_tasks_export.py` |
| 7 | commas, quotes and non-ASCII survive a round trip | integration | Titles `a, b`, `say "hi"` and `café` parse back unchanged with `csv.reader`. | `../specforge-pilot/tests/test_tasks_export.py` |
| 8 | no match is the header row only | integration | A member of a team with no tasks, and a filter `q=nothing like this` on a team with tasks: 200, `text/csv`, and a body that `csv.reader` parses to exactly the header row. Fails against an export that answers 404 or an empty body when nothing matches. | `../specforge-pilot/tests/test_tasks_export.py` |
| 9 | over 10,000 matching tasks is 422 | integration | 10,000 `todo` tasks and 1 `doing` inserted with raw sqlite3 into the test's `db` fixture file: unfiltered → 422 with `export too large; narrow it with q, status or assignee_id` and a JSON body, not `text/csv`; `status=todo` → 200 with exactly 10,000 data rows. Fails against an export without the cap and against a cap off by one. | `../specforge-pilot/tests/test_tasks_export.py` |
| 10 | the export does not hold the lock while building the file | integration | With one seeded task, `monkeypatch` replaces the module-level `teamtasks.app.csv_cell` with a wrapper that on its first call opens a raw sqlite3 connection to the test's `db` fixture file with a 0.2 s timeout, inserts a task into another team and commits; the test asserts the wrapper ran once per text cell (`calls == 3` for one task: title and both emails), the insert happened on its first call, the export is 200, and the inserted row is present afterwards. Fails against building the CSV inside the read Session, where the insert raises `database is locked`. | `../specforge-pilot/tests/test_tasks_export.py` |
| 11 | the path does not collide with the task route | integration | With a task created: `GET /teams/{id}/tasks/<task id>` still returns that task as JSON; `GET /teams/{id}/tasks.csv` is 200 `text/csv`. Fails against a route declared as `/tasks/{name}` or registered after the task route with a conflicting pattern. | `../specforge-pilot/tests/test_tasks_export.py` |
| 12 | `limit` and `offset` do not page the export | integration | With 3 tasks, `?limit=1&offset=1` → 200 with all 3 data rows. Fails against an export that passes the list route's paging through. | `../specforge-pilot/tests/test_tasks_export.py` |
| 13 | `csv_cell` prefixes control-character leads | unit | `csv_cell` on `\tx`, `\rx`, `\nx` and `a;\nx` returns `'\tx`, `'\rx`, `'\nx` and `a;'\nx`. The API cannot store these today (`../specforge-pilot/teamtasks/app.py:92-95`, `:146`); the row guards against a later relaxed validator. Fails against a trigger set without tab, CR or LF. | `../specforge-pilot/tests/test_tasks_export.py` |

## 10. Migration Plan

No schema change and no migration. Deploying the commit adds the route; rolling back is deploying the previous commit. No flag: the route is new and unused until called. Smoke check after deploy: as a member, `curl -s -o /dev/null -w '%{http_code} %{content_type}' -H 'Authorization: Bearer <token>' <host>/teams/<id>/tasks.csv` prints `200 text/csv; charset=utf-8`.

## Observability

No new log line; [PRD-016](016-teamtasks-team-audit-log.md) owns team logging. uvicorn's access log on stdout records each export request with its status, so a burst of `422`s or `500`s on `tasks.csv` is visible there by hand; a `422` is a bad filter or the cap, and its body says which. Who exported which team's data is not recorded — the same gap PRD-016 owns for every team action.

## 11. Open Questions

- [ ] Exports are unaudited until PRD-016. Cost: a PII file can leave the app without a trace. Owned by PRD-016.
- [ ] The 10,000-row cap is a guess with no usage data. Cost: a large team cannot export everything at once. Revisit with real data.
- [ ] No UTF-8 BOM: Excel on Windows may show non-ASCII titles as mojibake when the file is double-clicked. Cost: `café` reads wrong there; importing with UTF-8 selected reads it right. Add `utf-8-sig` if a user reports it.

## Clarifications

- 2026-10-25 — What does the CSV show for an assignee or creator who is no longer a member? → §2, §5.1, §8 row 3.
- 2026-10-25 — How is a `;` followed by a formula character treated? → §5.1 Cells.
- 2026-10-25 — Which status answers an export over the cap? → §5.1 Order of checks.

---

## Gate: Promotion to Implemented

```yaml
# amendment: §9 ← VALIDATION findings 1-2; bounce: specforge-quality-reviewer survives; commit f48cf85
commit_hash: [TBD]
tests:
  - [TBD]
system_artifact_diff:
  - [TBD]
```
