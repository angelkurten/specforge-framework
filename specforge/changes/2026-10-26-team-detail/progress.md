# Progress

**Budget**: 6 iterations, 2.50 USD

## Tasks

- [ ] ../specforge-pilot/tests/test_team_detail.py test_1_a_member_reads_the_team_with_their_own_role
- [ ] ../specforge-pilot/tests/test_team_detail.py test_2_a_non_member_sees_the_same_404_as_a_missing_team
- [ ] ../specforge-pilot/tests/test_team_detail.py test_3_no_valid_token_is_401
- [ ] ../specforge-pilot/tests/test_team_detail.py test_4_an_out_of_bounds_team_id_is_422
- [ ] every test in the sibling passes: `uv run --directory ../specforge-pilot --offline pytest -q`

## Blocked

## Log
- Lead: the code lives in `../specforge-pilot`, and you run from specforge. Run the tests with `uv run --directory ../specforge-pilot --offline pytest -q <path>`, and read the sibling's history with `git -C ../specforge-pilot …`. Never open `../specforge-pilot/teamtasks.db`. Add the one `docs/SYSTEM_ARTIFACT.md` line the contract's Scope names. Do not commit; the lead commits in both repositories.
