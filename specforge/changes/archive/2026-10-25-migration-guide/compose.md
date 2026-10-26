# Compose

| Lesson | Rung | Artifact | Why not lower |
|---|---|---|---|
| The guide must stay complete: its sections, paths that exist, the hook block and the README, mkdocs and CHANGELOG pointers | 1 test | `scripts/migration_guide_test.py` | — |
| The guide's sections must not fall back to placeholders, and its commands must stay in the `npx` form | 1 test | `scripts/migration_guide_fix_test.py` | — |
| A locked test contradicted an existing conformance test (PRD-005 § 9 row 14), and only cli-ci found it after the loop | 4 instruction | `.claude/skills/specforge-loop/SKILL.md` | grep finds the suites that read a file, but whether one conflicts with a new scenario is a judgement made while writing the premise |
| The loop left placeholder sections that heading-only tests passed; the lead found them by reading | 4 instruction | `.claude/skills/specforge-loop/SKILL.md` | What counts as enough content depends on each document; no generic test can say |
| The guide promised behaviour from a CLI not yet released; review found it | 5 doc | `specforge/core/review.md` | No test at HEAD can know which version npm serves; that is release-time knowledge, so the reviewer checks it |
