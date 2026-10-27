# Progress

**Budget**: 12 iterations, 4 USD

## Tasks

- [x] ../specforge-pilot/tests/test_team_stats.py test_1_counts_cover_only_this_team_with_every_status_in_order
- [x] ../specforge-pilot/tests/test_team_stats.py test_2_a_new_status_shows_with_zero_and_a_deleted_task_stops_counting
- [x] ../specforge-pilot/tests/test_team_stats.py test_3_a_non_member_sees_the_same_404_as_a_missing_team
- [x] ../specforge-pilot/tests/test_team_stats.py test_4a_no_valid_token_is_401 and test_4b_an_out_of_bounds_team_id_is_422
- [x] ../teamtasks-web/tests/stats.test.mjs 5 getTeamStats calls GET /teams/{id}/stats with the token, refuses bad ids, and rejects non-2xx
- [x] ../teamtasks-web/tests/stats.test.mjs 6 renderStats shows the total and each status in order, escaped
- [x] ../teamtasks-web/tests/stats.test.mjs 7 the team page fetches the stats and renders them
- [x] every backend test passes: `uv run --directory ../specforge-pilot --offline pytest -q`
- [x] every frontend test passes: `node --test ../teamtasks-web/tests/*.test.mjs`

## Blocked

## Log
- Lead: two code siblings, and you run from specforge. The backend is `../specforge-pilot`: run its tests with `uv run --directory ../specforge-pilot --offline pytest -q <path>`. The frontend is `../teamtasks-web`: run its tests with `node --test ../teamtasks-web/tests/<file>`. Read either repository's history with `git -C ../<sibling> …`. Never open `../specforge-pilot/teamtasks.db`, and never run `npm`. Add the `docs/SYSTEM_ARTIFACT.md` line in each sibling, as Scope says. Keep `tests/test_team_detail.py` (backend) and `tests/route.test.mjs` (frontend) green: both are locked by archived changes. Do not commit; the lead commits in all three repositories.
- Iter 1: added GET /teams/{team_id}/stats (team_membership, TeamId, two queries) in ../specforge-pilot/teamtasks/app.py; ran `uv run --directory ../specforge-pilot --offline pytest -q tests/test_team_stats.py -k test_1` -> 1 passed, 10 deselected.
- Iter 2: test_2 already satisfied by the iter-1 route (no code change); ran `uv run --directory ../specforge-pilot --offline pytest -q ../specforge-pilot/tests/test_team_stats.py -k test_2` -> 1 passed, 10 deselected.
- Iter 3: test_3 already satisfied by the route (team_membership gives the identical 404; no code change); ran `uv run --directory ../specforge-pilot --offline pytest -q tests/test_team_stats.py -k "test_3 or test_4"` -> 9 passed, 2 deselected.
- Iter 4: test_4a and test_4b already satisfied by the route (TeamId gives 422, auth dependency gives 401; no code change); ran `uv run --directory ../specforge-pilot --offline pytest -q tests/test_team_stats.py -k "test_4a or test_4b"` -> 8 passed, 3 deselected.
- Iter 5: added getTeamStats (same guard as getTeam) in ../teamtasks-web/src/api.mjs; stats.test.mjs cannot load yet (it also imports renderStats from team.mjs, task 6), so I ran test 5's assertions in an inline `node --input-type=module -e` script against api.mjs -> ok.
- Iter 6: added renderStats (total + one `<li>` per status in API order, names escaped with `esc`) in ../teamtasks-web/src/team.mjs; ran `node --test ../teamtasks-web/tests/stats.test.mjs` -> tests 5 and 6 pass, 7 fails as expected (main.mjs is task 7).
- Iter 7: main.mjs now fetches getTeam and getTeamStats together and renders renderTeam + renderStats (still parseTeamId(location.hash)); added the SYSTEM_ARTIFACT lines in ../teamtasks-web; ran `node --test ../teamtasks-web/tests/stats.test.mjs` -> 3 passed, 0 failed.
- Iter 8: added the stats route line to ../specforge-pilot/docs/SYSTEM_ARTIFACT.md; ran `uv run --directory ../specforge-pilot --offline pytest -q` -> 196 passed, 0 failed.
- Iter 9: ran `node --test ../teamtasks-web/tests/*.test.mjs` -> 11 tests, 11 passed, 0 failed.
