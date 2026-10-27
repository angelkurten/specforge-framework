# Compose

| Lesson | Rung | Artifact | Why not lower |
|---|---|---|---|
| v2 must keep working from a specforge sibling: the packet with `--repo`, and the guard on a sibling's tests | 1 test | `scripts/sibling_repos_test.py` | — |
| The edge forms of a path flag (absolute, subdirectory, symlink, bad ref, empty range) were found by review, not by Red | 1 test | `scripts/sibling_repos_fix2_test.py` | — |
| The same, as a habit for the next path or ref argument | 4 instruction | `.claude/skills/specforge-loop/SKILL.md` | Which spellings an argument can take is a judgement made while writing its red tests |
| The code commit was pushed together with its evidence again, though the review skill already warned about it | 4 instruction | `.claude/skills/specforge-review/SKILL.md` | A rung-2 check in `review_prep.py` for the last code commit's SHA in the CI field is proposed as its own change |
| A loop agent inherits the user's global configuration, and a plugin's comment convention leaked into the code | 5 doc | `specforge/core/loop.md` | specforge does not control what Claude Code loads from the user's settings; it can only tell the lead to read for it |
