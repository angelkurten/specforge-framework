# Compose

| Lesson | Rung | Artifact | Why not lower |
|---|---|---|---|
| review_prep.py reviews several siblings, paired in order | 1 test | `scripts/multi_sibling_review_test.py` | — |
| Three red tests passed against argparse's last-value behaviour until hardened | 4 instruction | `.claude/skills/specforge-loop/SKILL.md` | That a flag repeats is a design choice the test has to name; no generic check sees it |
| The several-siblings rule in loop.md was half written: it repeated `--add-dir` but not the runner and `git -C` rules | 5 doc | `specforge/core/loop.md` | The example is proven by the real two-sibling change, not by a test |
