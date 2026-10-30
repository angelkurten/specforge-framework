# Compose

| Lesson | Rung | Artifact | Why not lower |
|---|---|---|---|
| Retired files are classified before any write, by `dev`+`ino` identity, with the ancestor walk before any read; symlinks, FIFOs and sockets are kept unread; an unlink failure is not fatal; `kept` survives `--quiet`; printed paths are escaped | 1 test | `tools/cli/tests/integration/update-retire-hardening.test.ts` | — |
| The same, for the fix rounds (sockets, an unreadable bundle identity, the dry run's summary) | 1 test | `tools/cli/tests/integration/update-retire-hardening-fix2.test.ts` | — |
| A socket got past the design mode, the tests and the first post-code review | 5 doc | `specforge/core/review.md` | Which file types a change meets is a checklist item; no generic test knows the paths a change reads |
| A literal U+202E reached a locked test because the lead skipped the Cf scan, and review_prep missed a lock hash changed inside the range | 5 doc | `specforge/DECISIONS.md` | Both need script changes with their own tests: change `lock-checks`, queued before the file swap by the human |
