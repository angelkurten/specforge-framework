# Progress

**Budget**: 10 iterations, 3 USD

## Tasks

- [ ] ../teamtasks-web/tests/api.test.mjs 1 getTeam calls GET /teams/{id} with the bearer token and returns the team
- [ ] ../teamtasks-web/tests/api.test.mjs 2 a non-2xx answer throws an error carrying its status
- [ ] ../teamtasks-web/tests/api.test.mjs 3 an id that is not a positive safe integer is refused before any request
- [ ] ../teamtasks-web/tests/team.test.mjs 4 renderTeam shows the name and the caller role
- [ ] ../teamtasks-web/tests/team.test.mjs 5 renderTeam escapes API text
- [ ] ../teamtasks-web/tests/team.test.mjs 6 index.html loads the team view as a module
- [ ] ../teamtasks-web/tests/ci.test.mjs 7 ci.mjs logs a numbered run per commit and refuses a dirty tree
- [ ] every test in the sibling passes: `node --test ../teamtasks-web/tests/`

## Blocked

## Log
- Lead: the code lives in `../teamtasks-web`, and you run from specforge. Run the tests with `node --test ../teamtasks-web/tests/<file>`, and read the sibling's history with `git -C ../teamtasks-web …`. No dependencies: never run `npm`. Also write `src/main.mjs`, the `docs/SYSTEM_ARTIFACT.md` and a `.gitignore` holding `ci-runs.log`, as the contract's Scope says. Do not commit; the lead commits in both repositories.
