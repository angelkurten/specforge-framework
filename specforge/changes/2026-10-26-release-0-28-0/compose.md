# Compose

| Lesson | Rung | Artifact | Why not lower |
|---|---|---|---|
| The release files must agree on 0.28.0 and the entry must name what the CLI installs | 1 test | `scripts/release_0_28_0_test.py` | — |
| `review_prep.py` did not report a test re-locked from an archived change's lock (hash changed, no history lines) | 5 doc | `specforge/core/review.md` | The check in `review_prep.py` (rung 2) is a script change with its own tests; it is proposed as its own change |
| The high risk given at classification was not written into the contract, so review skipped the security checklist | 4 instruction | `.claude/skills/specforge-classify/SKILL.md` | A script can check that the block exists, not that it matches what the human confirmed |
| A test pinning a version or a release heading breaks the next release (guide test 7, `release_0_28_0_test`) | 4 instruction | `.claude/skills/specforge-loop/SKILL.md` | Whether a text is release-bound is a judgement made while writing the test |
