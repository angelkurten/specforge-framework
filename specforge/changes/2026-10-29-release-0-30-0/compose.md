# Compose

| Lesson | Rung | Artifact | Why not lower |
|---|---|---|---|
| The release files agree with VERSION and the 0.30.0 entry names what ships, in a test that survives the next release | 1 test | `scripts/release_0_30_0_test.py` | — |
| The lead wrote `Exercised: none` for a release whose CLI is user-visible, and the local `npm` is a pnpm alias that cannot pack | 4 instruction | `.claude/skills/specforge-review/SKILL.md` | That a release's path is its tarball is a judgement at review time; no script sees which changes are releases without a new convention |
| Two reviewers ran in the real tree despite the rule in their own definition; the clone procedure in the brief stopped it | 4 instruction | `.claude/skills/specforge-review/SKILL.md` | The reviewer's shell is outside any test or hook specforge controls; the brief is the one input it always reads |
