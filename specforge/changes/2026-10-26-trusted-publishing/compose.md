# Compose

| Lesson | Rung | Artifact | Why not lower |
|---|---|---|---|
| The release workflow must not depend on a stored token again | 1 test | `scripts/trusted_publishing_test.py` | — |
| A test reading history with `git show` failed on a shallow CI checkout | 2 rule | `.github/workflows/v2-ci.yml` | Checkout depth is set by CI, not by any test |
| The release job builds and tests on Node 24, which no CI exercised before the tag | 2 rule | `.github/workflows/cli-ci.yml` | A test cannot choose the job's runtime; it is CI configuration |
