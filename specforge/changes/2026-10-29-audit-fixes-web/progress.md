# Progress

**Budget**: 12 iterations, 4 USD

## Tasks

- [x] ../specforge-pilot/tests/test_cors.py test_1_a_default_origin_may_get_with_authorization
- [x] ../specforge-pilot/tests/test_cors.py test_2_another_origin_gets_no_allow_origin_and_post_is_refused
- [x] ../specforge-pilot/tests/test_cors.py test_3_the_variable_replaces_the_defaults_and_a_star_is_refused
- [x] ../teamtasks-web/tests/page_fix.test.mjs 4 a malformed stats body still shows the team
- [x] ../teamtasks-web/tests/main.test.mjs 5 the page renders on load and again on every hashchange
- [x] ../teamtasks-web/tests/main.test.mjs 6 a stale response never overwrites a newer hash
- [x] ../teamtasks-web/tests/main_fix.test.mjs 6b a stale error never overwrites a newer hash (fix round, by the lead: the code already passed)
- [x] ../teamtasks-web/tests/ci_fix.test.mjs 7a/7b only tracked tests run; none tracked logs fail
- [x] ../teamtasks-web/tests/ci_fix.test.mjs 8 started from scripts/, a failing tracked test logs fail at the root
- [x] every backend test passes: `uv run --directory ../specforge-pilot --offline pytest -q`
- [x] every frontend test passes: `node --test ../teamtasks-web/tests/*.test.mjs`

## Blocked

## Log

- Task 1: added CORSMiddleware + `cors_origins`/`TEAMTASKS_CORS_ORIGINS` handling to `create_app` (teamtasks/app.py); `pytest -q tests/test_cors.py -k test_1` → 1 passed.
- Task 2: no code change needed, task 1's CORSMiddleware already covers it; `pytest -q tests/test_cors.py -k test_2` → passed (full file: 3 passed).
- Task 3: no code change needed, task 1 already refuses `*` and strips empty entries/spaces; `pytest -q tests/test_cors.py` → 3 passed.
- Task 4: `src/page.mjs` ahora usa `.then(renderStats).catch(...)` para que un throw de renderStats también caiga al fallback; `node --test tests/page_fix.test.mjs tests/page.test.mjs` → 4 pass, 0 fail.
- Task 5: `src/main.mjs` ahora tiene `render()` que se ejecuta al cargar y en cada `hashchange`; `node --test tests/main.test.mjs tests/route.test.mjs` → test 5 pass, test 8 de route pass, test 6 falla (esperado, es la tarea 6).
- Task 6: `src/main.mjs` descarta la respuesta (o el error) si `location.hash` cambió durante el fetch; `node --test tests/main.test.mjs tests/route.test.mjs` → 3 pass, 0 fail.
- Task 7: `scripts/ci.mjs` ahora hace `chdir` a la raíz del repo y ejecuta `node --test` solo sobre `git ls-files 'tests/*.test.mjs'`, con fail si no hay ninguno; `node --test tests/ci_fix.test.mjs tests/ci.test.mjs` → 4 pass, 0 fail (el 8 ya pasa por el mismo cambio).
- Task 8: sin cambio de código, el `chdir` a la raíz de la tarea 7 ya lo cubre; `node --test tests/ci_fix.test.mjs` → 3 pass, 0 fail (incluye el 8).
- Task 9: `uv run --directory ../specforge-pilot --offline pytest -q` → 199 passed (196 previos + 3 de CORS), 0 fail.
- Task 10: `node --test tests/*.test.mjs` en ../teamtasks-web → 20 pass, 0 fail.
