# Compose

| Lesson | Rung | Artifact | Why not lower |
|---|---|---|---|
| A lock entry added after the first approval, and a CI field that names commits but not the last code commit, show in the mechanical findings | 1 test | `scripts/review_prep_lock_ci_test.py` | — |
| The CI-commit check had two false positives, an archive move and a blank-line sub-bullet, that only review found | 1 test | `scripts/review_prep_lock_ci_fix_test.py` | — |
| The lead rewrote a correct evidence line on a reviewer's diagnosis without re-running it, and the diagnosis was wrong | 4 instruction | `.claude/skills/specforge-review/SKILL.md` | Whether a diagnosis is true is settled by re-running it; no script can judge it |
