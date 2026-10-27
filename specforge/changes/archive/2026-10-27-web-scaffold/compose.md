# Compose

| Lesson | Rung | Artifact | Why not lower |
|---|---|---|---|
| The front end's API client and render: the id is checked, API text is escaped, and the local CI logs runs | 1 test | `../teamtasks-web/tests/api.test.mjs` | — |
| The hash id was coerced with `Number()` in untested glue code | 1 test | `../teamtasks-web/tests/route.test.mjs` | — |
| One change's contract was interleaved on the branch with another's archive, so the review range held both | 4 instruction | `.claude/skills/specforge-loop/SKILL.md` | Commit order is the lead's call; no script sees it coming |
| `review_prep.py` does not report an entry a fix round adds to a lock | 5 doc | `specforge/core/review.md` | Having the script report it (rung 2) is a script change, proposed as its own change |
