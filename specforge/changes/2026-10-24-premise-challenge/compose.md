# Compose

| Lesson | Rung | Artifact | Why not lower |
|---|---|---|---|
| The Premises heading was found by substring, so a mention in prose hid the section, including in this change's own contract | 1 test | `scripts/premise_challenge_fix_test.py` | — |
| An empty Premises section and a loose none bullet started the loop | 1 test | `scripts/premise_challenge_fix_test.py` | — |
| A premise result was read without its command | 1 test | `scripts/premise_challenge_fix2_test.py` | — |
| A change to the loop's own gate refused its own contract and blocked its fix round | 4 instruction | `specforge/core/loop.md` | Which loop.py a fix round runs on is a bootstrapping call for the human; no script can tell which version applies |
| Subtests sharing a marker file turned a correct refusal into a false red | 3 example | `scripts/premise_challenge_fix2_test.py` | A test-writing pattern, not a product defect; the helper that clears the marker is what the next test imitates |
