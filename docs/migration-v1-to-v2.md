# Migrating from v1 to specforge EVA

specforge EVA is v2 of specforge. EVA stands for Evidence, Verification, Adaptation. The name is for prose only; paths, skills, agents and scripts keep `specforge`.

## What changes

Work starts from a classified change instead of a PRD. `.claude/skills/specforge-classify` picks a mode (see `specforge/core/modes.md`), then a contract and red tests are written and locked. `.claude/skills/specforge-loop` builds against them (see `specforge/core/loop.md`), `.claude/skills/specforge-review` reviews with a clean context (see `specforge/core/review.md`), and `.claude/skills/specforge-compose` turns each lesson into the cheapest artifact that catches it (see `specforge/core/compose.md`). The name and the v2 default are recorded in `specforge/DECISIONS.md`.

## What stays

The v1 rules in `.claude/rules/hard-rules.md` and `.claude/rules/workflow.md` are not deleted, so the PRD workflow remains available. Your team data under `specforge/changes/` and `specforge/DECISIONS.md` is never overwritten by `specforge update` (`tools/cli/src/partition.ts`).

## Upgrade

1. Run `specforge update`. A bundled v2 file that is missing on disk is installed; a file on disk that is not in the manifest is reported as drift (`tools/cli/src/commands/update.ts`).
2. `update` does not write `.claude/settings.json`, because that file is team data, and only `init` prints the hook block. Paste this block into your `.claude/settings.json` yourself, merging it with any `hooks` you already have:

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

3. Run `specforge doctor`. It warns when the guard is installed but not registered in the settings (`tools/cli/src/validators/lock-guard-registered.ts`); a clean run means the lock guard is active.

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

## Your first change

Details are filled in by the tasks that follow.

## Known limits

Details are filled in by the tasks that follow.
