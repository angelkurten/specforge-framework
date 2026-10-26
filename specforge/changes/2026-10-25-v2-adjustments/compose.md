# Compose

| Lesson | Rung | Artifact | Why not lower |
|---|---|---|---|
| The three adjustments must stay written where the lead and the reviewer read them | 1 test | `scripts/v2_adjustments_test.py` | — |
| A `claude -p` loop agent cannot write under `.claude/`, and no `--allowedTools` rule lifts it; three runs were spent finding that out | 5 doc | `specforge/core/loop.md` | It is a property of Claude Code, not of specforge; no specforge script or test can change it, only tell the lead in advance |
| A doc test with short needles let a whole checklist item disappear without failing | 4 instruction | `.claude/skills/specforge-loop/SKILL.md` | Whether a phrase is unique to its item is a judgement made while writing the test |
| The design-panel rule, copied from the contract, gave v1 reviewers an incomplete brief; the review caught it, not the tests | 5 doc | `specforge/core/modes.md` | A doc test can check field names are present, not that a v1 reviewer can act on a v2 contract; the corrected paragraph is the artifact |
