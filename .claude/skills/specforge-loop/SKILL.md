---
name: specforge-loop
description: Build a Contract- or Controlled-mode specforge change with TDD — write red tests from the contract, get them approved and locked, then run the clean-context implementation loop. Use after specforge-classify has confirmed the mode and the contract exists.
---

# Run the loop

1. Read `core/loop.md`. It is the whole rule; this skill only runs it.
2. **Red.** From the contract's Acceptance evidence, write one failing test per scenario. Run them and confirm every one fails for the expected reason.
3. Show the human the list of tests and ask, as one question, whether to approve them. Do not write implementation code before the answer.
4. On approval, lock them: `python3 scripts/lock_tests.py approve <change> <test files>`. Create `<change>/progress.md` from `templates/progress.md`, with the budget from the contract's Stop and escalate section and one task per test.
5. **Green.** Run `python3 scripts/loop.py <change>`, or tell the human the command if this session should not run it. Report the exit line verbatim.
6. On exit 4 or 5, stop and show the human the reason; never edit a locked test to get past it.
