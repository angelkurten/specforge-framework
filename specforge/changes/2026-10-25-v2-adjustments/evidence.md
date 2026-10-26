## Evidence

- **Ran**:
  - The premise command, by hand, before Red.
  - `python3 specforge/scripts/loop.py specforge/changes/2026-10-25-v2-adjustments`, five times, with `claude -p --output-format json --model sonnet --permission-mode acceptEdits` and `--allowedTools=Bash(python3 *),Bash(git diff *),Bash(git status *),Bash(git log *)`. Two of those runs added `Edit` and `Write` rules for `.claude/skills/**`, first relative, then absolute.
  - Every suite in `.github/workflows/v2-ci.yml`, by the lead.
- **Result**:
  - **Premise.** It holds.
  - **Loop runs.**
    1. Exit 5 at iteration 4, 3/6 tasks: the agent was denied writing `.claude/skills/specforge-classify/SKILL.md`.
    2. Exit 5 at iteration 5: the relative `Edit(.claude/skills/**)` rule had no effect.
    3. Exit 2 at start: `2 iterations left for 3 tasks left`, the cumulative-budget refusal from `2026-10-25-loop-budget` working as designed. The human raised the budget to 9 iterations and 3 USD.
    4. Exit 5 at iteration 6: the absolute `//…/.claude/skills/**` rule had no effect either.
    5. After the lead wrote the skill line, iterations 7-9 finished tasks 4 and 5, then hit the cap (exit 3) with only the full-suite task open.
  - **Totals.** 9 iterations, 2.09 USD (`loop-runs.txt`, 9 lines).
  - **Suites.** All 30 pass, run by the lead.
- **CI**: GitHub Actions `v2-ci` run 40247790571 and `cli-ci` run 40247790542 on `6119828`, the last code commit: both success. The pushed head that adds this report gets its own runs, read before review.
- **Not checked**:
  - Whether a `settings.json` permission rule, rather than a CLI flag, would let a `claude -p` loop agent write under `.claude/`. Only the CLI flag was tried.
- **Deviations from the contract**:
  - **Skill line written by hand.** The lead wrote the classify skill's step 5 by hand, as agreed with the human, because Claude Code protects `.claude/` under acceptEdits and neither `--allowedTools` rule lifted that.
  - **Budget.** The human raised the budget from 7 iterations and 2.50 USD to 9 iterations and 3 USD.
  - **Full-suite task.** It was run and passed by the lead, after the loop reached its cap.
