---
name: specforge-loop
description: Build a Contract- or Controlled-mode specforge change with TDD — write red tests from the contract, get them approved and locked, then run the clean-context implementation loop. Use after specforge-classify has confirmed the mode and the contract exists.
---

# Run the loop

1. Read `specforge/core/loop.md`. It is the whole rule; this skill only runs it.
2. **Red.** From the contract's Acceptance evidence, write one failing test per scenario. Run them and confirm every one fails for the expected reason. A premise about existing tests checks every assertion they make on the behaviour being changed, status and body, not only the status code (pilot change 2026-10-25-team-task-statuses blocked on an export test's body).
3. Show the human the list of tests and ask, as one question, whether to approve them. Do not write implementation code before the answer.
4. On approval, lock them: `python3 specforge/scripts/lock_tests.py approve <change> <test files>`. Create `<change>/progress.md` from `templates/progress.md`, with the budget from the contract's Stop and escalate section and one task per test. Order the tasks by what each test calls, not by scenario number: a test that uses a route another task introduces goes after that task (pilot change 2026-10-25-team-task-statuses blocked on iteration 1).
5. **Green.** Run `python3 specforge/scripts/loop.py <change>`, or tell the human the command if this session should not run it. Report the exit line verbatim.
6. On exit 4 or 5, stop and show the human the reason; never edit a locked test to get past it.
