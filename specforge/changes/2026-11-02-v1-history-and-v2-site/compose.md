# Compose

| Lesson | Rung | Artifact | Why not lower |
|---|---|---|---|
| The rest of the v1 history sits under history/v1/, and the v2 site carries no v1 vocabulary | 1 test | `scripts/v2_site_test.py` | — |
| The site metadata, the history README, the changelog links and each concept page say what their sources say | 1 test | `scripts/v2_site_fix_test.py` | — |
| Moved test files were not declared as retired, a skipped draft let a self-contradicting test reach the loop, and a locked test was re-approved without unlock --reason | 4 instruction | `.claude/skills/specforge-loop/SKILL.md` | Each is a step the lead takes before or around Red; a script that refused a bare approve over a locked entry is a later change |
