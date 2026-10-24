# Compose

| Lesson | Rung | Artifact | Why not lower |
|---|---|---|---|
| v2 was installed under unprefixed names, so init and update could erase or overwrite a project's own core/, scripts/archive.py, changes/ and DECISIONS.md | 1 test | `tools/cli/tests/unit/partition-v2.test.ts` | — |
| The same, end to end: a project's own files must survive init --force --erase and update | 1 test | `tools/cli/tests/integration/init-v2.test.ts` | — |
| A registration in one settings file hid a malformed other one | 1 test | `tools/cli/tests/unit/validators/lock-guard-registered-fix.test.ts` | — |
| A directory pattern bundled a local __pycache__, because prepublish walks the disk | 2 rule | `tools/cli/src/partition.ts` | A clean CI checkout has no __pycache__, so no test there can see it; listing the five scripts one by one makes it structurally impossible |
