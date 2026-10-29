# Audit fixes for the team page, across the backend and the frontend

**Mode**: Contract

```
MODE PROPOSAL
Risk: high — touches a trust boundary: CORSMiddleware in create_app (teamtasks/app.py:351) decides which browser origins may call the authenticated API; it adds headers to the HTTP contract teamtasks-web consumes
Uncertainty: low — the five defects have reproductions from the blind audit; outcomes are written as scenarios in both siblings
Controlled flag: no — one team, no named regime
Mode: Contract
```

Confirmed by the human, 2026-10-29. The first change under the Exercised rule (change 2026-10-29-exercise-the-path): the evidence shows the page loading in a real browser against the running backend.

## Outcome

The team page works in a browser. Today every request is blocked by CORS, so the page is dead even though every test passes. It also keeps the team visible when the stats body is malformed, and it follows hash changes. The frontend's local CI stops logging false passes.

## Scope

In:
- **Backend `../specforge-pilot`:**
  - `teamtasks/app.py`: `create_app(db_path, cors_origins=None)` adds `CORSMiddleware` with an explicit origin list, `GET` only, the `Authorization` header only, no credentials. `None` reads `TEAMTASKS_CORS_ORIGINS` (`new`, comma-separated), defaulting to `http://localhost:5500,http://127.0.0.1:5500`. A `*` entry is refused at startup with `ValueError`.
  - `tests/test_cors.py` (`new`).
  - `docs/SYSTEM_ARTIFACT.md`: one line for CORS and the variable.
- **Frontend `../teamtasks-web`:**
  - `src/page.mjs`: the stats fallback also catches an exception thrown by `renderStats`.
  - `src/main.mjs`: renders on load and on every `hashchange`. A response for a hash that is no longer current is dropped.
  - `scripts/ci.mjs`: runs from the repository root wherever it is started. It runs only the tracked `tests/*.test.mjs` files, and with none tracked it logs a fail.
  - `README.md`: how to serve the page (`python3 -m http.server 5500 --bind 127.0.0.1`).
  - `tests/page_fix.test.mjs`, `tests/main.test.mjs`, `tests/ci_fix.test.mjs` (`new`), and `tests/main_fix.test.mjs` (`new`), added by the fix round.
  - `docs/SYSTEM_ARTIFACT.md`: the three behaviours.

Out:
- The two 🟢 membership races (team-detail, team-stats): debt, the older read routes behave the same.
- `Bearer null` without a token, a login page, a configurable base URL, deploy.
- CORS for methods other than `GET`.

## Context

- **Siblings:**
  - backend `../specforge-pilot` (rules `../specforge-pilot/CLAUDE.md`), branch from `92586cf`;
  - frontend `../teamtasks-web` (rules `../teamtasks-web/CLAUDE.md`), branch from `33ef266`.
- **Backend:** `../specforge-pilot/teamtasks/app.py` `create_app` (line 346) and the module-level `app` (line 797). `fastapi.middleware.cors.CORSMiddleware` is already installed with FastAPI.
- **Frontend:** `src/page.mjs` `loadTeamPage`, `src/main.mjs`, `scripts/ci.mjs`; the audit served the page from `http://127.0.0.1:5500`.
- **Locked tests this must keep green:**
  - backend: the full suite (196 tests);
  - frontend: `tests/ci.test.mjs` (scenario 7 of web-scaffold), `tests/page.test.mjs`, `tests/route.test.mjs` (pins `parseTeamId(location.hash)` in `main.mjs`), and the rest of the 14.
- **Run:**
  - backend: `uv run --directory ../specforge-pilot --offline pytest -q`;
  - frontend: `node --test ../teamtasks-web/tests/*.test.mjs`, or `node --test` in the sibling.
- **Do not open** `../specforge-pilot/teamtasks.db`.

## Constraints

- **Security:**
  - an explicit origin list, never `*`, and `allow_credentials` off: the token travels in a header, not a cookie;
  - an origin not in the list gets no `Access-Control-Allow-Origin` header;
  - `TEAMTASKS_CORS_ORIGINS` holds origins, never a secret.
- **Edge checklist:** empty entries and surrounding spaces in `TEAMTASKS_CORS_ORIGINS` are ignored; a stale response never overwrites a newer hash's page.
- No new dependency in either sibling. `main.mjs` keeps `parseTeamId(location.hash)`.

## Premises

- No CORS middleware exists yet — `grep -c CORSMiddleware ../specforge-pilot/teamtasks/app.py` → holds
- main.mjs has no hashchange listener yet — `grep -c hashchange ../teamtasks-web/src/main.mjs` → holds
- CORSMiddleware is importable offline — `uv run --directory ../specforge-pilot --offline python -c "import fastapi.middleware.cors"` → holds
- The backend suite passes before the change — `uv run --directory ../specforge-pilot --offline pytest -q` → holds
- The frontend suite passes before the change — `node --test ../teamtasks-web/tests/*.test.mjs` → holds

## Acceptance evidence

Backend, `tests/test_cors.py`:

1. A preflight from a default origin for `GET` with `Authorization` answers 200, echoing that origin, and allows `authorization`. A `GET` from it carries `Access-Control-Allow-Origin` with the same origin.
2. A preflight and a `GET` from an origin not in the list carry no `Access-Control-Allow-Origin`. A preflight for `POST` from an allowed origin is refused.
3. `TEAMTASKS_CORS_ORIGINS` replaces the defaults, ignoring empty entries and spaces. A `*` entry makes `create_app` raise `ValueError`.

Frontend:

4. `tests/page_fix.test.mjs`: a stats answer of 200 whose body is `null`, has no `by_status`, or has `by_status` as an object still shows the team, followed by `Stats unavailable`.
5. `tests/main.test.mjs`: with fake `document`, `location`, `sessionStorage`, `fetch` and `addEventListener`, importing `main.mjs` renders team 1. Firing `hashchange` with `#2` renders team 2, and with `#abc` shows `Invalid team id`. Fails against a page that reads the hash once.
6. `tests/main.test.mjs`: when `#1`'s response arrives after `#2`'s, the page shows team 2. Fails against assigning every response as it lands.
   6b. `tests/main_fix.test.mjs`: a late error for an old hash does not replace the newer hash's page either. Added by the fix round (review should-fix).
7. `tests/ci_fix.test.mjs`: a test file that is present but ignored (`.git/info/exclude`) is not run, and the log line counts only the tracked ones. With no tracked test file, the run logs `fail` and exits non-zero.
8. `tests/ci_fix.test.mjs`: started from `scripts/` with a failing tracked test, the run exits non-zero and writes `fail` to the root `ci-runs.log`, and no `scripts/ci-runs.log` appears.

Exercised, by the lead at review: the backend on a throwaway `TEAMTASKS_DB` under the scratchpad, the page served from `http://127.0.0.1:5500`, and a real browser opening `index.html#<id>` with a token: it shows the team and its counts, then a second team after a hash change.

Both siblings' full suites and local CIs pass on their last code commits. `v2-ci` and `cli-ci` pass on specforge's.

## Stop and escalate

Stop and ask if a locked test in either sibling must change, if CORS needs more than `GET` and `Authorization`, or if `main.mjs` cannot be tested without a new dependency. Budget: 12 iterations, 4 USD, for 10 tasks (8 scenarios and the two full suites).
