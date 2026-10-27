# teamtasks-web: the front end's first slice

**Mode**: Contract

```
MODE PROPOSAL
Risk: low — new local repo, no deploy; renders user text, so escaping is checked by a test (trust boundary at render)
Uncertainty: low — the scaffold's behaviour is written as scenarios: getTeam calls GET /teams/{id} with the bearer token; renderTeam escapes the name
Controlled flag: no — one team, no named regime
Mode: Contract
```

Confirmed by the human, 2026-10-27. This is the first change to the code sibling `../teamtasks-web`, run from specforge. It sets up the sandbox the human asked for: specforge, a backend sibling and a frontend sibling.

## Outcome

`../teamtasks-web` is a working front end slice. It can fetch one team from the teamtasks API and render it safely, and its own local CI logs runs the way the backend's does.

## Scope

In:
- `../teamtasks-web/src/api.mjs`: `getTeam(baseUrl, token, id, fetch)` (`new`).
- `../teamtasks-web/src/team.mjs`: `renderTeam(team)` (`new`), returning an HTML string with every API value escaped.
- `../teamtasks-web/src/main.mjs` (`new`): reads the team id from `location.hash` and the token from `sessionStorage`, calls `getTeam`, and puts `renderTeam`'s output into the page.
- `../teamtasks-web/index.html` (`new`).
- `../teamtasks-web/scripts/ci.mjs` (`new`): local CI. It refuses a dirty tree, runs `node --test`, and appends `run <n> <sha> pass|fail <UTC>` to `ci-runs.log`, which `.gitignore` ignores.
- `../teamtasks-web/docs/SYSTEM_ARTIFACT.md` (`new`).
- `SIBLINGS.md`: a `teamtasks-web` row. `.github/workflows/cli-ci.yml`: `--ignore-sibling=teamtasks-web` on the doctor step, since CI checks out specforge alone. The lead writes both with the contract.

Out:
- Login and token handling beyond reading `sessionStorage`.
- Any other view.
- A dev server, CORS and deploy.

## Context

- **Code sibling:** `../teamtasks-web`. Its rules are in `../teamtasks-web/CLAUDE.md`. The branch starts at `a7b4df2`.
- **API:** `GET /teams/{team_id}` in `../specforge-pilot`, from change `2026-10-26-team-detail`. It answers 200 `{id, name, role}`, 404 `team not found`, 401 and 422.
- **The local CI to mirror:** `../specforge-pilot/scripts/ci.py`.
- Tests run with `node --test`, run in the sibling: from specforge, `node --test ../teamtasks-web/tests/`. Node 26 is installed, and there are no dependencies.

## Constraints

- No dependency, and no `npm install`.
- API text is escaped: `& < > " '`.
- An id that is not a positive safe integer never reaches `fetch`. `2 ** 63` is not safe.
- `fetch` is a parameter, so no test touches the network.

## Premises

- Node's built-in runner is available with no install — `node --test --help` → holds
- The sibling is a git repository with a base commit — `git -C ../teamtasks-web rev-parse --verify HEAD` → holds
- The backend route exists — `grep -c '@app.get("/teams/{team_id}")' ../specforge-pilot/teamtasks/app.py` → holds

## Acceptance evidence

`node --test`, run in `../teamtasks-web`, passes:

1. `getTeam` calls `<base>/teams/<id>` once, with `Authorization: Bearer <token>`, and returns the JSON.
2. A 401 or a 404 rejects with an error whose `status` is that code.
3. `0`, `-1`, `1.5`, `'abc'`, `'7'`, `2 ** 63`, `NaN` and `null` are refused with a `TypeError`, before any request.
4. `renderTeam` shows the name and the role.
5. `renderTeam` escapes `& < > " '` in the name and the role.
6. `index.html` loads `./src/main.mjs` as a module.
7. `scripts/ci.mjs` logs `run 1` and `run 2` with the short SHA and `pass`, refuses a dirty tree, and logs `fail` for a failing suite.
8. Added by the fix round after review, approved by the human: `parseTeamId` turns the URL hash into a team id only for `#` followed by a canonical positive safe integer, and returns `null` for every other form. `main.mjs` uses it before `getTeam`.

The sibling's local CI passes on its last code commit. `v2-ci` and `cli-ci` pass on specforge's.

## Stop and escalate

Stop and ask if anything needs a dependency. Budget: 10 iterations, 3 USD, for 8 tasks (7 scenarios and the full suite); the fix round added scenario 8 and its re-run, 10 tasks in all.
