# Compose

| Lesson | Rung | Artifact | Why not lower |
|---|---|---|---|
| The ledger restore and append wrote through a hard link swapped in for `loop-runs.txt` | 1 test | `scripts/loop_budget_fix4_test.py` | — |
| A non-UTF-8 ledger was a traceback, not exit 4 | 1 test | `scripts/loop_budget_fix4_test.py` | — |
| A fixed temp name moved the write-through to `loop-runs.txt.tmp`, and a symlink there reached any writable file | 1 test | `scripts/loop_budget_fix5_test.py` | — |
| The lead spotted the fixed temp name in the diff and handed it to review instead of stopping the change | 4 instruction | `.claude/skills/specforge-review/SKILL.md` | Whether a gap the lead sees is a blocker is a judgement; the skill can tell the lead to send it back through the loop before review |
