# Migrating from v1 to specforge EVA

specforge EVA is v2 of specforge. EVA stands for Evidence, Verification, Adaptation. The name is for prose only; paths, skills, agents and scripts keep `specforge`.

## What changes

Work starts from a classified change instead of a PRD. `.claude/skills/specforge-classify` picks a mode (see `specforge/core/modes.md`), then a contract and red tests are written and locked. `.claude/skills/specforge-loop` builds against them (see `specforge/core/loop.md`), `.claude/skills/specforge-review` reviews with a clean context (see `specforge/core/review.md`), and `.claude/skills/specforge-compose` turns each lesson into the cheapest artifact that catches it (see `specforge/core/compose.md`). The name and the v2 default are recorded in `specforge/DECISIONS.md`.

## What stays

The v1 rules in `.claude/rules/hard-rules.md` and `.claude/rules/workflow.md` are not deleted, so the PRD workflow remains available. Your team data under `specforge/changes/` and `specforge/DECISIONS.md` is never overwritten by `npx @angelkurten/specforge update` (`tools/cli/src/partition.ts`). Your `SIBLINGS.md` registry and your frozen PRDs and ADRs also stay as they are: v2 adds files next to them and removes none. The files in `templates/` are framework files, so `update` refreshes any you have not edited; from 0.27.3 the upgrade only adds templates, but from an older v1 it rewrites them too.

## Upgrade

specforge EVA ships in the CLI from **0.28.0**. Check the version you would get with `npx @angelkurten/specforge version`: an earlier CLI installs none of the v2 files, and `doctor` then has no guard to warn about.

1. Run `npx @angelkurten/specforge update`. A bundled v2 file that is missing on disk is installed; a file on disk that is not in the manifest is reported as drift (`tools/cli/src/commands/update.ts`).
2. `update` does not write `.claude/settings.json`, because the CLI does not bundle that file, and only `init` prints the hook block. Paste this block into your `.claude/settings.json` yourself, merging it with any `hooks` you already have:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit|NotebookEdit|Bash",
        "hooks": [
          {
            "type": "command",
            "command": "python3 \"$CLAUDE_PROJECT_DIR/.claude/hooks/specforge_lock_guard.py\""
          }
        ]
      }
    ]
  }
}
```

3. Run `npx @angelkurten/specforge doctor`. It warns when the guard is installed but not registered in the settings (`tools/cli/src/validators/lock-guard-registered.ts`); a clean run only means the hook is registered, not that it has been exercised.

## In-flight PRDs

- A PRD in `Draft` can finish under v1: keep the v1 workflow (reviewer panel, gate block, `Implemented`) until it ships. Nothing in the upgrade removes the v1 pieces.
- `Implemented` PRDs are not converted: they stay frozen snapshots, and a PRD at `Superseded` stays as it is too.
- New work after the upgrade starts as a v2 change instead of a new PRD.

## v1 to v2 map

| v1 | v2 |
|---|---|
| PRD | contract in `specforge/changes/<date>-<slug>/contract.md` |
| Reviewer panel | `.claude/skills/specforge-review` |
| Gate block | locked tests plus the loop in `specforge/core/loop.md` |
| Lessons in a PRD | `specforge/core/compose.md` |
| Shipped state and history | `specforge/scripts/archive.py` closes the change |

## Your first change

1. Ask for the change and let `specforge-classify` pick a mode and scaffold `specforge/changes/<date>-<slug>/` once you confirm.
2. Write `specforge/changes/<date>-<slug>/contract.md` and the red tests, then run `specforge/scripts/lock_tests.py approve` so the approved tests are locked.
3. Run `specforge/scripts/loop.py` to let the clean-context loop work through `specforge/changes/<date>-<slug>/progress.md` within its budget.
4. Run `specforge-review` for an adversarial review, then `specforge-compose` to turn each lesson into the cheapest artifact that catches it.
5. Close the change with `specforge/scripts/archive.py`.

## Working on a sibling repository

Keep specforge as a sibling directory beside your code and run the whole change from specforge. The change folder and its lock stay in specforge, while the code and tests live in the sibling: lock entries are written as `../<sibling>/<test file>`, the agent command adds `--add-dir ../<sibling>` so edits there are accepted, and `git -C ../<sibling>` reads its history. For the review packet, pass `--repo ../<sibling>` together with `--repo-base <ref>` to `specforge/scripts/review_prep.py`, so the sibling's diff is checked like specforge's own. See `specforge/core/loop.md` for the loop details. The `--repo` and `--repo-base` flags ship in the CLI from **0.29.0**; the `specforge/scripts/review_prep.py` that 0.28.0 installs rejects them, so check `npx @angelkurten/specforge version` first.

## Known limits

- The pilot compared v2 Contract with v1 PRD: 10 human minutes against 25, but about twice as many defects escaped per 1000 lines (6.1 against 3.3), and v2 is the default with three adjustments (`specforge/DECISIONS.md`): an edge checklist in `specforge/core/review.md` for every Contract and Controlled change; Direct ships with an edge test (a bound, an empty or control-character input); and an optional design panel (v1's backend, security and quality reviewers on the contract, before Red) for high-risk changes that touch design.
- The pilot result is not final: `escaped_2w` for the pilot is due on 2026-11-08, and the decision in `specforge/DECISIONS.md` is revisited if the escape rate is still above v1's.
- `specforge/scripts/loop.py` is not a sandbox. It guards its budget ledger against accidental damage only; against a hostile agent, the defence is reviewing the diff.
- The lock guard is a hook that you register yourself in `.claude/settings.json`; `update` does not write it. The Claude Code adapter (hooks and skills) lives under `.claude/`; the core in `specforge/` works without it.
