// changes/2026-10-23-init-installs-v2 scenarios 4–5.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkTmpDir } from "../helpers.js";
import { runInit } from "../../src/commands/init.js";
import { runPrepublish } from "../../scripts/prepublish.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

const V2_FILES = [
  "core/modes.md",
  "core/loop.md",
  "core/review.md",
  "core/compose.md",
  "scripts/lock_tests.py",
  "scripts/loop.py",
  "scripts/review_prep.py",
  "scripts/archive.py",
  "scripts/compose_check.py",
  ".claude/hooks/specforge_lock_guard.py",
  ".claude/skills/specforge-classify/SKILL.md",
  ".claude/skills/specforge-loop/SKILL.md",
  ".claude/skills/specforge-review/SKILL.md",
  ".claude/skills/specforge-compose/SKILL.md",
];

let pkgDir: string;
let tmpDir: string;

beforeEach(async () => {
  pkgDir = await mkTmpDir();
  tmpDir = await mkTmpDir();
  await fs.writeFile(
    path.join(pkgDir, "package.json"),
    JSON.stringify({ name: "@angelkurten/specforge", version: "0.0.0" }, null, 2) + "\n",
  );
  expect(await runPrepublish({ repoRoot: REPO_ROOT, cliRoot: pkgDir })).toBe(0);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await fs.rm(pkgDir, { recursive: true, force: true });
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("init installs v2", () => {
  it("4–5. installs core, the scripts, the guard and the skills, writes no settings, and prints the hook block", async () => {
    let out = "";
    vi.spyOn(process.stdout, "write").mockImplementation((chunk: string | Uint8Array) => {
      out += String(chunk);
      return true;
    });
    const code = await runInit({
      cwd: tmpDir,
      force: false,
      erase: false,
      noGitSafety: false,
      dryRun: false,
      quiet: true,
      importMetaUrl: pathToFileURL(path.join(pkgDir, "dist", "cli.js")).href,
    });
    expect(code).toBe(0);
    for (const rel of V2_FILES) {
      await expect(fs.access(path.join(tmpDir, rel)), `${rel} must be installed`).resolves.toBeUndefined();
    }
    await expect(fs.access(path.join(tmpDir, ".claude", "settings.json"))).rejects.toThrow();
    await expect(fs.access(path.join(tmpDir, "scripts", "loop_test.py"))).rejects.toThrow();
    expect(out).toContain("specforge_lock_guard.py");
    expect(out).toContain("PreToolUse");
  });
});
