# Compose

| Lesson | Rung | Artifact | Why not lower |
|---|---|---|---|
| approve straight over a locked entry left no trace | 1 test | `scripts/reapprove_fix_test.py` | — |
| The loop handed the agent a test a human had unlocked | 1 test | `scripts/reapprove_fix_test.py` | — |
| A newline in a reason forged lock lines and crashed the guard open | 1 test | `scripts/reapprove_fix_test.py` | — |
| A deleted lock, removed history, a dirty tree or an archive move hid lock changes | 1 test | `scripts/reapprove_fix2_test.py` | — |
| A decoy lock, a non-ASCII path or a duplicated history line hid lock changes | 1 test | `scripts/reapprove_fix3_test.py` | — |
| A hook cannot stop an agent that has a shell; a guarantee must rest on the reviewed diff | 5 doc | `specforge/DECISIONS.md` | It is a design principle about where a control can live, not a defect a test, rule or example could catch |
