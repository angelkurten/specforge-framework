# Progress

**Budget**: 6 iterations, 2.50 USD

## Tasks

- [x] ../specforge-pilot/tests/test_team_detail.py test_1_a_member_reads_the_team_with_their_own_role
- [x] ../specforge-pilot/tests/test_team_detail.py test_2_a_non_member_sees_the_same_404_as_a_missing_team
- [x] ../specforge-pilot/tests/test_team_detail.py test_3_no_valid_token_is_401
- [x] ../specforge-pilot/tests/test_team_detail.py test_4_an_out_of_bounds_team_id_is_422
- [x] every test in the sibling passes: `uv run --directory ../specforge-pilot --offline pytest -q`

## Blocked

## Log
- Lead: the code lives in `../specforge-pilot`, and you run from specforge. Run the tests with `uv run --directory ../specforge-pilot --offline pytest -q <path>`, and read the sibling's history with `git -C ../specforge-pilot …`. Never open `../specforge-pilot/teamtasks.db`. Add the one `docs/SYSTEM_ARTIFACT.md` line the contract's Scope names. Do not commit; the lead commits in both repositories.
- Iter 1: added `GET /teams/{team_id}` in app.py (team_membership + one name query) and the SYSTEM_ARTIFACT line; `uv run --offline pytest -q tests/test_team_detail.py -k test_1` → 1 passed.
- Iter 2: no code change needed (the iter-1 route, via `team_membership`, already returns the same 404 for a non-member and a missing team); `uv run --directory ../specforge-pilot --offline pytest -q tests/test_team_detail.py -k test_2` → 1 passed.
- Iter 3: no code change needed (`current_user` via `team_membership` already returns 401); `uv run --directory ../specforge-pilot --offline pytest -q tests/test_team_detail.py -k test_3` → 4 passed.
- Iter 4: no code change needed (`TeamId` already bounds the path id); `uv run --directory ../specforge-pilot --offline pytest -q tests/test_team_detail.py -k test_4` → 4 passed.
- Iter 5: `uv run --directory ../specforge-pilot --offline pytest -q` → 185 passed, 184 warnings (UserWarning de alembic ya existente), 0 failed.
