# Compose

| Lesson | Rung | Artifact | Why not lower |
|---|---|---|---|
| `approve` refuses a file holding an invisible character; `review_prep` reports an entry re-approved after the lock's first version in the range | 1 test | `scripts/lock_checks_test.py` | — |
| A test that is not valid UTF-8 is approved as before | 1 test | `scripts/lock_checks_fix_test.py` | — |
| The tool input turns a typed `\u` escape into the literal character, in a test and in an evidence file | 4 instruction | `.claude/skills/specforge-loop/SKILL.md` | The scripts now refuse the result; how the lead types a character is outside any script |
