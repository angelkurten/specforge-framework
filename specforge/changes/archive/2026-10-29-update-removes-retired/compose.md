# Compose

| Lesson | Rung | Artifact | Why not lower |
|---|---|---|---|
| `update` removes only declared, untouched retired files; symlinks are never followed; only a missing file is already gone; the dry run reports unreadable paths | 1 test | `tools/cli/tests/integration/update-retire.test.ts` | — |
| The same, for the fix rounds | 1 test | `tools/cli/tests/integration/update-retire-fix2.test.ts` | — |
| A draft run against the full suite before locking caught a destructive design that all 8 new tests passed | 4 instruction | `.claude/skills/specforge-loop/SKILL.md` | Which suite protects which adopter file is not visible to a script; the lead must run the draft |
| Controlled's mutation sample cannot come from a read-only reviewer | 4 instruction | `.claude/skills/specforge-review/SKILL.md` | Who runs the sample is a process step at review |
| Symlinks, directories and unreadable files at a path the code reads or removes surfaced only at review | 5 doc | `specforge/core/review.md` | A checklist item for the reviewer; no generic test knows which paths a change reads |
