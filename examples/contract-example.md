# Worked example: a v2 change, contract and evidence

Source: the archived change `2026-10-29-audit-fixes-web` (its `contract.md`, then its `evidence.md`). It passed review with its user-visible path exercised in a real browser.

---

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
  - ~~`docs/SYSTEM_ARTIFACT.md`: one line for CORS and the variable.~~ Removed at compose: v2 changes no longer maintain it (`specforge/DECISIONS.md`, 2026-10-29).
- **Frontend `../teamtasks-web`:**
  - `src/page.mjs`: the stats fallback also catches an exception thrown by `renderStats`.
  - `src/main.mjs`: renders on load and on every `hashchange`. A response for a hash that is no longer current is dropped.
  - `scripts/ci.mjs`: runs from the repository root wherever it is started. It runs only the tracked `tests/*.test.mjs` files, and with none tracked it logs a fail.
  - `README.md`: how to serve the page (`python3 -m http.server 5500 --bind 127.0.0.1`).
  - `tests/page_fix.test.mjs`, `tests/main.test.mjs`, `tests/ci_fix.test.mjs` (`new`), and `tests/main_fix.test.mjs` (`new`), added by the fix round.
  - ~~`docs/SYSTEM_ARTIFACT.md`: the three behaviours.~~ Removed at compose, as above.

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

---

## Evidence

- **Ran**:
  - The five premise commands, by hand, before Red.
  - The nine red tests against a throwaway draft implementation in scratch clones of both siblings, before locking: 20/20 frontend, 199/199 backend. The clones were deleted.
  - `python3 specforge/scripts/loop.py specforge/changes/2026-10-29-audit-fixes-web --max-iterations 12 --max-cost 4`, once, with the two-sibling agent command of `specforge/core/loop.md` § Sibling repositories (`--add-dir ../specforge-pilot --add-dir ../teamtasks-web`, the `uv run --directory ../specforge-pilot --offline *` and `node --test ../teamtasks-web/*` rules, and the six `git -C` reads).
  - Backend: `python3 scripts/ci.py` in `../specforge-pilot`. Frontend: `node scripts/ci.mjs` in `../teamtasks-web`.
- **Result**:
  - **Premises.** All five hold.
  - **Loop.** 10 iterations, 10/10 tasks, exit 0. Cost 1.73 USD (`loop-runs.txt`).
  - **Backend.** 199 passed, the 196 earlier tests and the 3 in `tests/test_cors.py`.
  - **Frontend.** 21 of 21 pass: the 14 earlier tests, the 6 new ones, and 6b from the fix round.
  - **Red.** On base `33ef266`, the six new frontend tests fail (the reviewer re-ran them in a scratch clone). The three backend tests cannot pass on base, which has no `cors_origins` and no middleware. 6b passes on HEAD and fails once `src/main.mjs:21` (`if (location.hash !== hash) return`) is deleted in a scratch clone.
- **Exercised**: the backend ran on a throwaway `TEAMTASKS_DB` under the scratchpad (`uv run --offline uvicorn teamtasks.app:app --host 127.0.0.1 --port 8000`), and the page was served with `python3 -m http.server 5500 --bind 127.0.0.1`. A seeded user owns team 1, `Platform`, with tasks todo 1 and doing 2, and team 2, `Design <b>&</b>`. In Chromium, through Playwright, with the token in `sessionStorage`:
  - `#1` shows `Platform`, role owner, `Tasks: 3`, and todo 1, doing 2, done 0. The network log has `GET http://localhost:8000/teams/1` 200 and `/teams/1/stats` 200.
  - A hash change to `#2` shows team 2 with its name escaped (`Design &lt;b&gt;&amp;&lt;/b&gt;`). `#abc` shows `Invalid team id`. `#999` shows `Error 404`.
  - After a reload of `#1` (navigation type `reload`), the page shows team 1 again.
  - The only console errors are the 404 for `favicon.ico` and the expected 404 for `/teams/999`. There is no CORS error. Before this change, the audit's run of the same page was blocked by CORS.
  - With curl, before seeding (so both answered 404), `GET /teams/1/stats` with `Origin: http://127.0.0.1:5500` carried `access-control-allow-origin: http://127.0.0.1:5500`, and the same request with `Origin: http://evil.test` carried none.
- **CI**:
  - backend: local run 37 on `f3be36f`, pass (run 36 on `1569d9a` before the SYSTEM_ARTIFACT revert);
  - frontend: local run 7 on `4e86e1e`, pass (run 6 on `7668e5e` after the fix round, run 5 on `1cc15d3` before it);
  - specforge: the last code commit is the compose instructions, `bda14f0`, pushed alone: `v2-ci` run 40973292418 and `cli-ci` run 40973292293, both success. All 45 v2 suites also passed locally before the push.
- **Not checked**:
  - A browser other than Chromium.
  - The stale-response drop (scenario 6) in a real browser. It is timing-dependent, and only the fake-globals test covers it.
- **Deviations from the contract**:
  - **Written by the lead.** The frontend `README.md` section on serving the page. No test covers it.
  - **SYSTEM_ARTIFACT, written and reverted.** The lead put `docs/SYSTEM_ARTIFACT.md` lines in Scope out of v1 habit, against `specforge/DECISIONS.md` 2026-10-29, and wrote them in both siblings. At compose the human chose to revert them: `../specforge-pilot` `f3be36f`, `../teamtasks-web` `4e86e1e`.
  - **Reviewer incident.** In re-verification the reviewer's `cd` into a scratch clone failed, and its next commands ran in `../teamtasks-web`. They deleted line 21 of `src/main.mjs` in the real tree. The reviewer restored the line with `git checkout`. The lead checked afterwards: the tree was clean, HEAD was unchanged at `7668e5e`, and 6b's hash matched the lock.
  - **Stale-response check.** `main.mjs` compares `location.hash` before and after the request, with no counter. Going A → B → A while the first A is still pending would show the first A's answer, which is the same team.
  - **Review (PASS, one should-fix, three nits).**
    - **Should-fix, fixed by a test.** No test covered dropping a stale *error*. The lead re-ran the reviewer's mutant: with `src/main.mjs:21` deleted, both tests in `main.test.mjs` still passed. Test 6b (`tests/main_fix.test.mjs`) was approved and locked by the human. The code already did the drop, so the fix round changed no code and ran no loop.
    - **Nits, accepted as debt.**
      - Starlette's `CORSMiddleware` does not check the method on a simple, non-preflighted request. So `GET` only limits preflighted requests. Any request carrying `Authorization` is preflighted.
      - A `TEAMTASKS_CORS_ORIGINS` entry that is not an origin (a trailing slash, a path, an uppercase scheme) is accepted silently and never matches. It fails closed.
      - The red run was missing from this report. It is now under Result.
