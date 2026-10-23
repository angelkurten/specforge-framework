// The v2 lock guard (specforge/changes/2026-10-23-specforge-namespace). `init` installs the
// hook script but never writes .claude/settings.json, which is team data; it
// prints this block for the team to paste instead.

export const GUARD_PATH = ".claude/hooks/specforge_lock_guard.py";

export const SETTINGS_SNIPPET = `{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit|NotebookEdit|Bash",
        "hooks": [
          {
            "type": "command",
            "command": "python3 \\"$CLAUDE_PROJECT_DIR/${GUARD_PATH}\\""
          }
        ]
      }
    ]
  }
}`;
