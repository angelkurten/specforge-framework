---
name: specforge-compose
description: Close a specforge change by turning each lesson it taught into the cheapest artifact that catches it — test, rule, example, instruction or doc — and recording it in compose.md. Use after review, before archiving the change.
---

# Compose a change

1. Read `specforge/core/compose.md`. It is the whole rule; this skill only runs it.
2. Collect the lessons: the change's evidence report (Not checked, deviations, review tables), any `BLOCKED:` line, loop stop reasons, and reviewer findings. Check CI on the head commit too; a red run nobody read is a lesson.
3. For each lesson, propose the lowest rung that would catch it alone, and the artifact. Prefer an artifact that already exists over writing a new one.
4. Show the human the proposed table and ask, as one question, whether to apply it.
5. Build any missing artifact (a new test goes red first, through the loop's approval), write `<change>/compose.md`, and run `python3 specforge/scripts/compose_check.py <change>` until it exits 0.
