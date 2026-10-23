// changes/2026-10-23-init-installs-v2 scenarios 6–8.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { mkTmpDir } from "../../helpers.js";
import { validator } from "../../../src/validators/lock-guard-registered.js";

const GUARD = ".claude/hooks/specforge_lock_guard.py";
const REGISTERED = JSON.stringify({
  hooks: {
    PreToolUse: [
      {
        matcher: "Edit|Write|MultiEdit|NotebookEdit|Bash",
        hooks: [{ type: "command", command: `python3 "$CLAUDE_PROJECT_DIR/${GUARD}"` }],
      },
    ],
  },
});

let tmpDir: string;

async function write(rel: string, text: string): Promise<void> {
  await fs.mkdir(path.dirname(path.join(tmpDir, rel)), { recursive: true });
  await fs.writeFile(path.join(tmpDir, rel), text);
}

beforeEach(async () => {
  tmpDir = await mkTmpDir();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("doctor: lock-guard-registered", () => {
  it("6. warns when the guard is installed and no settings file registers it", async () => {
    await write(GUARD, "# guard\n");
    await write(".claude/settings.json", JSON.stringify({ permissions: { deny: [] } }));
    const findings = await validator.run(tmpDir);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe("warning");
    expect(findings[0]!.message).toContain("specforge_lock_guard.py");
  });

  it("7. reports nothing when settings.json or settings.local.json registers it, or the guard is absent", async () => {
    expect(await validator.run(tmpDir)).toHaveLength(0);
    await write(GUARD, "# guard\n");
    await write(".claude/settings.json", REGISTERED);
    expect(await validator.run(tmpDir)).toHaveLength(0);
    await fs.rm(path.join(tmpDir, ".claude/settings.json"));
    await write(".claude/settings.local.json", REGISTERED);
    expect(await validator.run(tmpDir)).toHaveLength(0);
  });

  it("8. a malformed settings.json is a warning naming the file, not an exception", async () => {
    await write(GUARD, "# guard\n");
    await write(".claude/settings.json", "{ not json");
    const findings = await validator.run(tmpDir);
    expect(findings.some((f) => f.severity === "warning" && f.message.includes("settings.json"))).toBe(true);
  });
});
