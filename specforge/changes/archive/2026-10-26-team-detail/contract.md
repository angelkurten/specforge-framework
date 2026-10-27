# teamtasks: read one team

**Mode**: Contract

```
MODE PROPOSAL
Risk: high — touches authorization: a new read route gated by team membership (a non-member must not learn the team exists)
Uncertainty: low — the outcome is written as scenarios, and the route follows the existing /teams/{team_id}/... pattern
Controlled flag: no — one team, no named regime
Mode: Contract
```

Confirmed by the human, 2026-10-26. This is the first change run from the specforge sibling against a code sibling (`specforge/core/loop.md` § Sibling repositories).

## Outcome

A team member can read one team by id with `GET /teams/{team_id}`. The response is `{"id", "name", "role"}`, the caller's own role, the same shape as an entry of `GET /teams`. Today there is only the list.

## Scope

In:
- `../specforge-pilot/teamtasks/app.py`: the route `GET /teams/{team_id}` (`new`), gated by the existing `team_membership` dependency.
- `../specforge-pilot/tests/test_team_detail.py` (`new`): the red tests.
- `../specforge-pilot/docs/SYSTEM_ARTIFACT.md`: one line for the new route.

Out:
- Any change to `GET /teams`, to membership or to roles.
- Any other field in the response.

## Context

- **Code sibling:** `../specforge-pilot`. Its rules are in `../specforge-pilot/CLAUDE.md`. The branch starts at `1b8c11e`.
- `../specforge-pilot/teamtasks/app.py`:
  - `team_membership` raises 404 `team not found` for a non-member and for a missing team alike;
  - `TeamId` bounds the path id to 1..2^63-1;
  - `teams_query` and `list_teams` build the list entry `{"id", "name", "role"}`.
- `../specforge-pilot/tests/test_teams.py`: the fixtures `user`, `make_team`, `add`, `team`. Test 9 holds a non-member's 404 to be identical to a missing team's. Test 3 holds the four invalid-token header shapes to a 401.
- Tests run with `uv run --directory ../specforge-pilot --offline pytest -q`. The sibling's CI is local: `python3 scripts/ci.py`, run in the sibling, which logs to `ci-runs.log`.
- **Do not open** `../specforge-pilot/teamtasks.db`. The tests use a temporary database.

## Constraints

- **Security:**
  - authentication on the new route, through `current_user` via `team_membership`;
  - a non-member's response is byte-identical to a missing team's, by status, body and timing class: there is no extra query before the membership check;
  - no new dependency.
- **Edge checklist:** `team_id` uses `TeamId`, so 0, a negative id, a non-integer and 2^63 get the same 422 as the other team routes.
- Every existing test in the sibling passes.

## Premises

- The membership dependency already answers a non-member like a missing team — `grep -c 'raise HTTPException(404, "team not found")' ../specforge-pilot/teamtasks/app.py` → holds
- No `GET /teams/{team_id}` route exists yet — `grep -c '@app.get("/teams/{team_id}")' ../specforge-pilot/teamtasks/app.py` → holds
- The sibling's tests run offline from specforge, with no install — `uv run --directory ../specforge-pilot --offline python -c pass` → holds
- No sibling test enumerates the app's routes, so adding one breaks none — `grep -rn "app.routes" ../specforge-pilot/tests` → holds

## Acceptance evidence

`uv run --directory ../specforge-pilot --offline pytest -q` passes, including `tests/test_team_detail.py`:

1. A member gets 200 `{"id", "name", "role"}` with their own role (owner, then member), equal to their entry in `GET /teams`.
2. A non-member and a missing id both get 404 `{"detail": "team not found"}`, identical.
3. No token, and each invalid header shape (`Bearer`, `Basic abc`, `Bearer nope`), gets 401.
4. `team_id` of 0, -1, `abc` and 2^63 gets 422.

The sibling's local CI (`python3 scripts/ci.py`) passes on the sibling's last code commit. `v2-ci` and `cli-ci` pass on specforge's.

## Stop and escalate

Stop and ask if the route needs anything beyond `team_membership` and one query, or if an existing test must change. Budget: 6 iterations, 2.50 USD, for 5 tasks (4 scenarios and the full suite).
