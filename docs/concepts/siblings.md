# Sibling projects

specforge lives beside the code repositories it governs, as a sibling directory: `../<sibling>`. It is never vendored inside one. The change folder and its lock stay in specforge; the code and tests stay in the sibling.

## Locking and running

- Lock entries are paths under `../<sibling>/`, such as `../<sibling>/tests/slug_test.py`. `lock_tests.py` and `loop.py` resolve them from specforge unchanged.
- The loop's agent command adds `--add-dir ../<sibling>`, so edits are allowed there, and sets `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1` so the sibling's `CLAUDE.md` loads.
- Git reads in the sibling use `git -C ../<sibling>`, with the allow rules naming the sibling literally.
- The sibling's own test runner is allowed through one literal rule, with an offline flag so an iteration cannot install anything.

## Review

`review_prep.py` takes `--repo ../<sibling>` and `--repo-base <ref>` together and reads the sibling's range through the same checks. With several siblings, repeat both flags once per sibling, paired in order.

## Briefing

A sub-agent working in a sibling is briefed explicitly with that sibling's own `CLAUDE.md`; specforge does not load it for you. See [Loop](loop.md) for the full agent command.
