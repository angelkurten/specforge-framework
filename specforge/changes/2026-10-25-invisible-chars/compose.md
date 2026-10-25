# Compose

| Lesson | Rung | Artifact | Why not lower |
|---|---|---|---|
| A literal U+202E, written by the file tool from a typed escape, reached two locked tests, a PRD and this change's own contract with no check seeing it | 1 test | `scripts/invisible_chars_test.py` | — |
| `splitlines` split added lines on U+2028, so a line separator could never be seen as part of a line | 1 test | `scripts/invisible_chars_test.py` | — |
| The approved contract carried the very character it bans, and only the new check caught it, after the loop | 4 instruction | `.claude/skills/specforge-loop/SKILL.md` | Running review_prep on the contract before approval is a judgement call the skill can prompt; making approve refuse is a lock_tests.py change for a later round |
| A test asserting an absence (test_5) does not name the broken implementation, and fixing the comment needs a re-approval | 5 doc | `specforge/changes/2026-10-25-invisible-chars/evidence.md` | A comment-only re-approval costs a human act for no behaviour; recorded for the next change that touches the file |
