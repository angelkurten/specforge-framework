# Compose

| Lesson | Rung | Artifact | Why not lower |
|---|---|---|---|
| A new install gets v2 only, every moved v1 path is retired, and an update from 0.30.0 removes the untouched ones, keeps the edited ones and halts on a drifted CLAUDE.md | 1 test | `tools/cli/tests/integration/v1-swap.test.ts` | — |
| No shipped file names a moved path or a v1 agent; the READMEs carry no vacated token; the one shipped agent is read-only | 1 test | `tools/cli/tests/conformance/v2.test.ts` | — |
| The guide misdescribed a full rollback and listed too few kept-file cases; CLAUDE.md pointed adopters at a directory they do not have | 1 test | `scripts/v1_swap_fix_test.py` | — |
