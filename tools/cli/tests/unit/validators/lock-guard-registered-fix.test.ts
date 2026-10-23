// specforge/changes/2026-10-23-specforge-namespace, review finding: a
// registration in one settings file must not hide a malformed other one.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { mkTmpDir } from "../../helpers.js";
import { validator } from "../../../src/validators/lock-guard-registered.js";

const GUARD = ".claude/hooks/specforge_lock_guard.py";
const REGISTERED = JSON.stringify({
  hooks: { PreToolUse: [{ matcher: "Edit", hooks: [{ type: "command", command: `python3 "$CLAUDE_PROJECT_DIR/${GUARD}"` }] }] },
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

describe("doctor: lock-guard-registered keeps every malformed-file warning", () => {
  it("a malformed settings.json still warns when settings.local.json registers the guard", async () => {
    await write(GUARD, "# guard\n");
    await write(".claude/settings.json", "{ not json");
    await write(".claude/settings.local.json", REGISTERED);
    const messages = (await validator.run(tmpDir)).map((f) => f.message);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain("settings.json");
    expect(messages[0]).toContain("not valid JSON");
  });
});
