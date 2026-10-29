# Compose

| Lesson | Rung | Artifact | Why not lower |
|---|---|---|---|
| The page was dead in a browser: no CORS on the backend, while every test passed on fakes | 1 test | `../specforge-pilot/tests/test_cors.py` | — |
| A stale error was dropped with no test covering it; the reviewer's mutant found it | 1 test | `../teamtasks-web/tests/main_fix.test.mjs` | — |
| A reviewer's failed `cd` let its `sed` run in the real sibling tree | 4 instruction | `.claude/agents/specforge/specforge-reviewer.md` | No test or hook sees which directory a reviewer's shell is in; the agent's own discipline does |
| The lead put SYSTEM_ARTIFACT.md in Scope against the 2026-10-29 decision | 4 instruction | `.claude/skills/specforge-classify/SKILL.md` | What goes in Scope is the contract writer's call, written at classify |
