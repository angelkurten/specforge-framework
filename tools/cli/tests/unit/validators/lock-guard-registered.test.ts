// specforge/changes/2026-10-23-specforge-namespace scenarios 7–9.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { mkTmpDir } from "../../helpers.js";
import { validator } from "../../../src/validators/lock-guard-registered.js";

const GUARD = ".claude/hooks/specforge_lock_guard.py";
const COMMAND = `python3 "$CLAUDE_PROJECT_DIR/${GUARD}"`;
const hookAt = (event: string, matcher: string, command: string) =>
  JSON.stringify({ hooks: { [event]: [{ matcher, hooks: [{ type: "command", command }] }] } });
const REGISTERED = hookAt("PreToolUse", "Edit|Write|MultiEdit|NotebookEdit|Bash", COMMAND);

let tmpDir: string;

async function write(rel: string, text: string): Promise<void> {
  await fs.mkdir(path.dirname(path.join(tmpDir, rel)), { recursive: true });
  await fs.writeFile(path.join(tmpDir, rel), text);
}

async function warnings(): Promise<string[]> {
  return (await validator.run(tmpDir)).filter((f) => f.severity === "warning").map((f) => f.message);
}

beforeEach(async () => {
  tmpDir = await mkTmpDir();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("doctor: lock-guard-registered", () => {
  it("7. warns when the guard is installed and unregistered; silent when it is not installed", async () => {
    expect(await validator.run(tmpDir)).toHaveLength(0);
    await write(GUARD, "# guard\n");
    await write(".claude/settings.json", JSON.stringify({ permissions: { deny: [] } }));
    const w = await warnings();
    expect(w).toHaveLength(1);
    expect(w[0]).toContain("specforge_lock_guard.py");
  });

  it("8. only a PreToolUse command naming the guard counts, in settings.json or settings.local.json", async () => {
    await write(GUARD, "# guard\n");
    await write(".claude/settings.json", REGISTERED);
    expect(await validator.run(tmpDir)).toHaveLength(0);
    await fs.rm(path.join(tmpDir, ".claude/settings.json"));
    await write(".claude/settings.local.json", REGISTERED);
    expect(await validator.run(tmpDir)).toHaveLength(0);
    await fs.rm(path.join(tmpDir, ".claude/settings.local.json"));
    // A mention that is not a registration still warns.
    await write(".claude/settings.json", hookAt("PostToolUse", "Edit", COMMAND));
    expect(await warnings()).toHaveLength(1);
    await write(".claude/settings.json", hookAt("PreToolUse", "specforge_lock_guard.py", "echo hi"));
    expect(await warnings()).toHaveLength(1);
  });

  it("9. malformed JSON warns naming the file; JSON null warns as unregistered", async () => {
    await write(GUARD, "# guard\n");
    await write(".claude/settings.json", "{ not json");
    expect((await warnings()).some((m) => m.includes("settings.json") && m.includes("not valid JSON"))).toBe(true);
    await write(".claude/settings.json", "null");
    const w = await warnings();
    expect(w).toHaveLength(1);
    expect(w[0]).not.toContain("not valid JSON");
    expect(w[0]).toContain("registers it");
  });
});
