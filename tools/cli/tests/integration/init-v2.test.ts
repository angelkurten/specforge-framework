// specforge/changes/2026-10-23-specforge-namespace scenarios 4–6.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkTmpDir } from "../helpers.js";
import { runInit } from "../../src/commands/init.js";
import { runUpdate } from "../../src/commands/update.js";
import { runPrepublish } from "../../scripts/prepublish.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

const V2_FILES = [
  "specforge/core/modes.md",
  "specforge/core/loop.md",
  "specforge/core/review.md",
  "specforge/core/compose.md",
  "specforge/scripts/lock_tests.py",
  "specforge/scripts/loop.py",
  "specforge/scripts/review_prep.py",
  "specforge/scripts/archive.py",
  "specforge/scripts/compose_check.py",
  ".claude/hooks/specforge_lock_guard.py",
  ".claude/skills/specforge-classify/SKILL.md",
  ".claude/skills/specforge-loop/SKILL.md",
  ".claude/skills/specforge-review/SKILL.md",
  ".claude/skills/specforge-compose/SKILL.md",
];

// A project's own files whose names an unprefixed v2 once claimed.
const OWNED = {
  "core/notes.md": "our architecture notes\n",
  "scripts/archive.py": "print('our own archive script')\n",
  "changes/2025-q3/release.md": "towncrier fragment\n",
  "DECISIONS.md": "# Our decisions\n",
};

let pkgDir: string;
let tmpDir: string;
let importMetaUrl: string;

async function init(extra: { force?: boolean; erase?: boolean } = {}): Promise<number> {
  return runInit({
    cwd: tmpDir,
    force: extra.force ?? false,
    erase: extra.erase ?? false,
    noGitSafety: true,
    dryRun: false,
    quiet: true,
    importMetaUrl,
  });
}

async function plantOwned(): Promise<void> {
  for (const [rel, text] of Object.entries(OWNED)) {
    await fs.mkdir(path.dirname(path.join(tmpDir, rel)), { recursive: true });
    await fs.writeFile(path.join(tmpDir, rel), text);
  }
}

async function assertOwnedUntouched(): Promise<void> {
  for (const [rel, text] of Object.entries(OWNED)) {
    expect(await fs.readFile(path.join(tmpDir, rel), "utf8"), `${rel} must be untouched`).toBe(text);
  }
}

beforeEach(async () => {
  pkgDir = await mkTmpDir();
  tmpDir = await mkTmpDir();
  await fs.writeFile(
    path.join(pkgDir, "package.json"),
    JSON.stringify({ name: "@angelkurten/specforge", version: "0.0.0" }, null, 2) + "\n",
  );
  expect(await runPrepublish({ repoRoot: REPO_ROOT, cliRoot: pkgDir })).toBe(0);
  importMetaUrl = pathToFileURL(path.join(pkgDir, "dist", "cli.js")).href;
});

afterEach(async () => {
  vi.restoreAllMocks();
  await fs.rm(pkgDir, { recursive: true, force: true });
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("init installs v2 under specforge/", () => {
  it("4. installs the v2 files, writes no settings, and prints the hook block", async () => {
    let out = "";
    vi.spyOn(process.stdout, "write").mockImplementation((chunk: string | Uint8Array) => {
      out += String(chunk);
      return true;
    });
    expect(await init()).toBe(0);
    for (const rel of V2_FILES) {
      await expect(fs.access(path.join(tmpDir, rel)), `${rel} must be installed`).resolves.toBeUndefined();
    }
    await expect(fs.access(path.join(tmpDir, ".claude", "settings.json"))).rejects.toThrow();
    expect(out).toContain("specforge_lock_guard.py");
    expect(out).toContain("PreToolUse");
  });

  it("5. init --force --erase leaves a project's own core/, scripts, changes/ and DECISIONS.md untouched", async () => {
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    expect(await init()).toBe(0);
    await plantOwned();
    expect(await init({ force: true, erase: true })).toBe(0);
    await assertOwnedUntouched();
  });

  it("6. update leaves a project's own scripts/archive.py untouched and out of the manifest", async () => {
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    expect(await init()).toBe(0);
    await plantOwned();
    expect(await runUpdate({ cwd: tmpDir, strategy: null, dryRun: false, quiet: true, importMetaUrl })).toBe(0);
    await assertOwnedUntouched();
    const manifest = JSON.parse(await fs.readFile(path.join(tmpDir, ".specforge", "manifest.json"), "utf8"));
    const tracked = manifest.framework_files.map((f: { path: string }) => f.path);
    for (const rel of Object.keys(OWNED)) expect(tracked, rel).not.toContain(rel);
  });
});
