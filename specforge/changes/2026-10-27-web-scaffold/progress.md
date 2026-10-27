# Progress

**Budget**: 10 iterations, 3 USD

## Tasks

- [x] ../teamtasks-web/tests/api.test.mjs 1 getTeam calls GET /teams/{id} with the bearer token and returns the team
- [x] ../teamtasks-web/tests/api.test.mjs 2 a non-2xx answer throws an error carrying its status
- [x] ../teamtasks-web/tests/api.test.mjs 3 an id that is not a positive safe integer is refused before any request
- [x] ../teamtasks-web/tests/team.test.mjs 4 renderTeam shows the name and the caller role
- [x] ../teamtasks-web/tests/team.test.mjs 5 renderTeam escapes API text
- [x] ../teamtasks-web/tests/team.test.mjs 6 index.html loads the team view as a module
- [x] ../teamtasks-web/tests/ci.test.mjs 7 ci.mjs logs a numbered run per commit and refuses a dirty tree
- [x] every test in the sibling passes: `node --test ../teamtasks-web/tests/`
- [ ] ../teamtasks-web/tests/route.test.mjs 8 only a canonical positive safe integer in the hash becomes a team id
- [ ] every test in the sibling passes again: `node --test ../teamtasks-web/tests/*.test.mjs`

## Blocked

## Log
- Lead: the code lives in `../teamtasks-web`, and you run from specforge. Run the tests with `node --test ../teamtasks-web/tests/<file>`, and read the sibling's history with `git -C ../teamtasks-web …`. No dependencies: never run `npm`. Also write `src/main.mjs`, the `docs/SYSTEM_ARTIFACT.md` and a `.gitignore` holding `ci-runs.log`, as the contract's Scope says. Do not commit; the lead commits in both repositories.
- Iter 1: wrote ../teamtasks-web/src/api.mjs (getTeam); `node --test ../teamtasks-web/tests/api.test.mjs` → 3 pass, 0 fail (task 1; 2 and 3 also pass).
- Iter 2: no code change needed; `node --test ../teamtasks-web/tests/api.test.mjs` → 3 pass, 0 fail; test 2 passes against the existing `getTeam` (task 2).
- Iter 3: no code change needed; `node --test ../teamtasks-web/tests/api.test.mjs` → 3 pass, 0 fail; test 3 passes against the existing `getTeam` guard (`Number.isSafeInteger(id) && id > 0`) (task 3).
- Iter 4: wrote ../teamtasks-web/src/team.mjs (renderTeam, with escaping); `node --test ../teamtasks-web/tests/team.test.mjs` → 2 pass, 1 fail (test 6 needs index.html, task 6); tests 4 and 5 pass (task 4).
- Iter 5: no code change needed; `node --test ../teamtasks-web/tests/team.test.mjs` → 2 pass, 1 fail (test 6 needs index.html, task 6); test 5 passes against the existing `renderTeam` escaping of `& < > " '` (task 5).
- Iter 6: wrote ../teamtasks-web/index.html and src/main.mjs; `node --test ../teamtasks-web/tests/team.test.mjs` → 3 pass, 0 fail (task 6).
- Iter 7: wrote ../teamtasks-web/scripts/ci.mjs and .gitignore (ci-runs.log); ci.mjs clears NODE_TEST_CONTEXT so the inner `node --test` reports a real exit code under the outer runner; `node --test ../teamtasks-web/tests/ci.test.mjs` → 1 pass, 0 fail (task 7). Note for task 8: `node --test ../teamtasks-web/tests/` (directory arg) fails on Node 26 with 'test failed' before running any file.
- Iter 8: no code change; `node --test` run in ../teamtasks-web (the contract's acceptance command) → 7 pass, 0 fail; `node --test ../teamtasks-web/tests/*.test.mjs` → 7 pass, 0 fail. The literal directory form `node --test ../teamtasks-web/tests/` still fails on Node 26 ('test failed', runner treats the dir as a module), so the task line's command should read `tests/*.test.mjs` (task 8).
- Lead: review PASS with one should-fix. `src/main.mjs` passed `Number(location.hash.slice(1))` to `getTeam`, so `#0x10`, `#1e3`, `#+7` and `#7.0` became ids. The human approved fix round test 8, with the budget unchanged (2 iterations left). Add `src/route.mjs` `parseTeamId(hash)`: it returns the number only for `/^#[1-9]\d*$/` within `Number.MAX_SAFE_INTEGER`, and `null` otherwise. `main.mjs` uses it and shows `Invalid team id` on `null`, without calling `getTeam`. Four nits are accepted as debt.
