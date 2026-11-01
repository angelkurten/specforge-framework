# Compose

| Lesson | Rung | Artifact | Why not lower |
|---|---|---|---|
| A test deletion the contract declares with a reason is a should-fix to confirm; an undeclared one stays a blocker | 1 test | `scripts/retired_tests_test.py` | — |
| The declaration is read from git at HEAD, and an entry absent from the contract's first version is flagged, across an archive move too | 1 test | `scripts/retired_tests_fix2_test.py` | — |
| A check that lowers a finding was first written to read the working tree and trust the latest version | 5 doc | `specforge/core/review.md` | A design rule for future checks; no generic test sees which input a new check reads |
