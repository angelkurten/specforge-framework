# Compose

| Lesson | Rung | Artifact | Why not lower |
|---|---|---|---|
| `GET /teams/{team_id}` must keep answering only its members | 1 test | `../specforge-pilot/tests/test_team_detail.py` | — |
| Running v2 from specforge against a real sibling works: `--add-dir` was enough, and the sibling's tests run through one literal `uv run --directory` rule | 5 doc | `specforge/core/loop.md` | A usage pattern for the lead; no test can show that a run against a real sibling works |
| Whether the sibling's `CLAUDE.md` loaded, and whether `git -C` matched, went unconfirmed because the agent's output was not kept | 5 doc | `specforge/core/loop.md` | Having `loop.py` keep agent output is a script change, proposed as its own change |
