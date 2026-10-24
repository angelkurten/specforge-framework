# Compose

| Lesson | Rung | Artifact | Why not lower |
|---|---|---|---|
| Two evidence reports omitted CI although a skill already asked for it | 1 test | `scripts/evidence_ci_test.py` | — |
| An empty field borrowed the text of the section after it | 1 test | `scripts/evidence_ci_fix_test.py` | — |
| A placeholder, wrapped or not, satisfied a presence check | 1 test | `scripts/evidence_ci_fix2_test.py` | — |
| Any digit, as in a workflow name like v2-ci, satisfied the run rule | 1 test | `scripts/evidence_ci_fix3_test.py` | — |
| Whether the runs a report names exist and are green | 4 instruction | `.claude/skills/specforge-review/SKILL.md` | The scripts run offline and cannot read CI; the reviewer reads the named runs, as specforge/core/review.md § Evidence and step 4 of this skill require |
