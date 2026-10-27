# Team stats, across the backend and the frontend

**Mode**: Contract

```
MODE PROPOSAL
Risk: high — a new authorization-gated read route; the counts must cover only the caller's team, and a non-member must get the same 404 as a missing team. Status names are team-defined text that the frontend renders.
Uncertainty: low — follows GET /teams/{team_id} and /statuses; outcomes are written as scenarios in both siblings
Controlled flag: no — one team, no named regime
Mode: Contract
```

Confirmed by the human, 2026-10-27. This is the first change across two code siblings, run from specforge (`specforge/core/loop.md` § Sibling repositories).

## Outcome

A team member opening the team page sees how many tasks the team has, in total and per status. The backend gets a new route for the counts, and the frontend renders them. Neither half is any use without the other.

## Scope

In:
- **Backend `../specforge-pilot`:**
  - `teamtasks/app.py`: `GET /teams/{team_id}/stats` (`new`), behind `team_membership`, returning `{"task_count", "by_status"}`. `by_status` holds every status of the team in `TaskStatus.id` order, zeros included, counting only that team's tasks.
  - `tests/test_team_stats.py` (`new`).
  - `docs/SYSTEM_ARTIFACT.md`: one line for the route.
- **Frontend `../teamtasks-web`:**
  - `src/api.mjs`: `getTeamStats(baseUrl, token, id, fetch)` (`new`), with the same guard as `getTeam`.
  - `src/team.mjs`: `renderStats(stats)` (`new`), with the total and one entry per status in API order, every status name escaped.
  - `src/main.mjs`: also fetches the stats and renders them under the team.
  - `tests/stats.test.mjs` (`new`).
  - `docs/SYSTEM_ARTIFACT.md`: the page now shows the counts.

Out:
- Changing `GET /teams/{team_id}` or `GET /teams`.
- Per-assignee counts.
- A CORS, auth or deploy change.

## Context

- **Siblings:**
  - backend `../specforge-pilot` (rules `../specforge-pilot/CLAUDE.md`), branch from `82a31b5`;
  - frontend `../teamtasks-web` (rules `../teamtasks-web/CLAUDE.md`), branch from `24fa026`.
- **Backend:** `../specforge-pilot/teamtasks/app.py`:
  - `team_membership` (the identical 404);
  - `TeamId`;
  - `Task.team_id` and `Task.status`;
  - `TaskStatus`, whose `id` sets the order;
  - `list_statuses`, the ordering to follow.
- **Frontend:**
  - `../teamtasks-web/src/api.mjs` `getTeam`, the guard to reuse;
  - `src/team.mjs` `esc` and `renderTeam`;
  - `src/route.mjs` `parseTeamId`.
- **Locked tests this must keep green:**
  - backend: `tests/test_team_detail.py`, which pins `GET /teams/{team_id}` to exactly `{id, name, role}`;
  - frontend: `tests/team.test.mjs` and `tests/route.test.mjs`, which pin `main.mjs` to `parseTeamId(location.hash)` with no `Number(location.hash`.
- **Run:**
  - backend: `uv run --directory ../specforge-pilot --offline pytest -q`;
  - frontend: `node --test ../teamtasks-web/tests/*.test.mjs`, or `node --test` in the sibling.
- **Do not open** `../specforge-pilot/teamtasks.db`.

## Constraints

- **Security:**
  - the route requires a member;
  - a non-member's response is identical to a missing team's;
  - no query runs before the membership check;
  - counts never include another team's tasks.
- **Edge checklist:**
  - `team_id` uses `TeamId` in the backend and the shared guard in the frontend;
  - status names, which teams create, are escaped where they meet HTML.
- No new dependency in either sibling.

## Premises

- No stats route exists yet — `grep -c '/stats' ../specforge-pilot/teamtasks/app.py` → holds
- The backend's existing locked suite passes before the change — `uv run --directory ../specforge-pilot --offline pytest -q tests/test_team_detail.py` → holds
- The frontend suite passes before the change — `node --test ../teamtasks-web/tests/api.test.mjs ../teamtasks-web/tests/team.test.mjs ../teamtasks-web/tests/route.test.mjs ../teamtasks-web/tests/ci.test.mjs` → holds

## Acceptance evidence

Backend, `tests/test_team_stats.py`:

1. A member gets `{"task_count", "by_status"}` for this team only, with every status in order, zeros included.
2. A status added later appears with 0. A deleted task stops counting.
3. A non-member and a missing team get the same 404, `team not found`.
4. Invalid tokens get 401, and out-of-bounds ids get 422.

Frontend, `tests/stats.test.mjs`:

5. `getTeamStats` calls `<base>/teams/<id>/stats` with the token. Bad ids are refused before any request. A non-2xx answer rejects with its `status`.
6. `renderStats` shows the total and each status in API order, with the names escaped.
7. `main.mjs` fetches and renders the stats, and still takes the id from `parseTeamId(location.hash)`.

Both siblings' full suites and local CIs pass on their last code commits. `v2-ci` and `cli-ci` pass on specforge's.

## Stop and escalate

Stop and ask if a locked test in either sibling must change, or if the route needs more than `team_membership` and two queries. Budget: 12 iterations, 4 USD, for 9 tasks (7 scenarios and the two full suites).
