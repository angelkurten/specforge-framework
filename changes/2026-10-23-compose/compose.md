# Compose

Lessons from the six changes archived on 2026-10-23, and from building this one.

| Lesson | Rung | Artifact | Why not lower |
|---|---|---|---|
| A guard fix dropped the git rm and git mv forms, a regression the review caught | 1 test | `scripts/guard_git_test.py` | — |
| The loop reported a moved change folder and never checked the hashes, so an edited test slipped through | 1 test | `scripts/archive_fix_test.py` | — |
| review_prep.py blocked its own change on patterns written as data | 1 test | `scripts/review_fp_test.py` | — |
| The v2 Python suites ran only when someone remembered; nothing ran them on push | 2 rule | `.github/workflows/v2-ci.yml` | The tests existed; what was missing was something that runs them on every push |
| cli-ci was red on five v2 pushes in a row, and nobody read it | 4 instruction | `.claude/skills/specforge-review/SKILL.md` | The sensor already existed and fired. No test or script can see a remote CI result without network access, so the gap is in reading it |
| An evidence report claimed a suite passed that did not | 4 instruction | `core/review.md` | A script cannot map free-form Ran lines to commands it could re-run; the reviewer re-runs them. A rung-2 re-runner is possible later |
| Classifier rules were ambiguous on 4 cases that only a human could settle | 3 example | `tests/v2/classify_cases.md` | Classification is judgement; no test can run it without an agent, but a worked case table can anchor one |
