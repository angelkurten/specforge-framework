# Progress

**Budget**: 12 iterations, 4 USD

## Tasks

- [ ] ../specforge-pilot/tests/test_team_stats.py test_1_counts_cover_only_this_team_with_every_status_in_order
- [ ] ../specforge-pilot/tests/test_team_stats.py test_2_a_new_status_shows_with_zero_and_a_deleted_task_stops_counting
- [ ] ../specforge-pilot/tests/test_team_stats.py test_3_a_non_member_sees_the_same_404_as_a_missing_team
- [ ] ../specforge-pilot/tests/test_team_stats.py test_4a_no_valid_token_is_401 and test_4b_an_out_of_bounds_team_id_is_422
- [ ] ../teamtasks-web/tests/stats.test.mjs 5 getTeamStats calls GET /teams/{id}/stats with the token, refuses bad ids, and rejects non-2xx
- [ ] ../teamtasks-web/tests/stats.test.mjs 6 renderStats shows the total and each status in order, escaped
- [ ] ../teamtasks-web/tests/stats.test.mjs 7 the team page fetches the stats and renders them
- [ ] every backend test passes: `uv run --directory ../specforge-pilot --offline pytest -q`
- [ ] every frontend test passes: `node --test ../teamtasks-web/tests/*.test.mjs`

## Blocked

## Log
- Lead: two code siblings, and you run from specforge. The backend is `../specforge-pilot`: run its tests with `uv run --directory ../specforge-pilot --offline pytest -q <path>`. The frontend is `../teamtasks-web`: run its tests with `node --test ../teamtasks-web/tests/<file>`. Read either repository's history with `git -C ../<sibling> …`. Never open `../specforge-pilot/teamtasks.db`, and never run `npm`. Add the `docs/SYSTEM_ARTIFACT.md` line in each sibling, as Scope says. Keep `tests/test_team_detail.py` (backend) and `tests/route.test.mjs` (frontend) green: both are locked by archived changes. Do not commit; the lead commits in all three repositories.
