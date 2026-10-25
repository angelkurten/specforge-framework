# Compose

| Lesson | Rung | Artifact | Why not lower |
|---|---|---|---|
| A symlinked lock hid a re-approval: the lock was compared as its link text | 1 test | `scripts/symlinked_lock_test.py` | — |
| The symlink refusal lived only in the check command line, not in the function archive.py and loop.py call | 1 test | `scripts/symlinked_lock_fix_test.py` | — |
| A lock type change was paired by exact path, so an archive move hid it | 1 test | `scripts/symlinked_lock_fix_test.py` | — |
| The Outcome promised more than the scenarios exercised: nobody checked that the loop and archive went through the refusal | 2 rule | `specforge/scripts/loop.py` | A per-change test does not generalise; the premise gate refuses to start until each premise names its command and result |
| loop.py hid the agent's stderr, so a failing agent command showed only its exit code | 1 test | `scripts/premise_challenge_test.py` | — |
| A space-separated allowedTools list swallowed the prompt loop.py appends last | 3 example | `specforge/core/loop.md` | It is a flag of the Claude CLI, outside the repo; no suite here can exercise it without a model, and the stderr now shows its error |
| Closing an accepted risk left its record stale in the decision log and the review rule | 5 doc | `specforge/DECISIONS.md` | Whether a risk is closed is a judgement; no script can decide it |
