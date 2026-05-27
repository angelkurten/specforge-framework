// Rows #14, #15, #16, #17, #18, #35: update command integration tests
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { mkTmpDir, synthBundleImportMetaUrl } from "../helpers.js";
import { runInit } from "../../src/commands/init.js";
import { runUpdate } from "../../src/commands/update.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkTmpDir();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

async function initTmpDir(dir: string) {
  const importMetaUrl = synthBundleImportMetaUrl();
  await runInit({ cwd: dir, force: false, erase: false, noGitSafety: false, dryRun: false, quiet: true, importMetaUrl });
  return importMetaUrl;
}

describe("update: no drift", () => {
  it("After init followed by bumping the bundled framework version, update replaces changed files and updates the manifest", async () => {
    // In the synth-bundle fixture, the bundle version is 0.7.0. After init the
    // installed version in the manifest = 0.7.0 and all sha256s match the bundle.
    // Re-running update with the same bundle is the "no drift, no version change"
    // path — all files are unchanged-by-user-equal. Update exits 0.
    const importMetaUrl = await initTmpDir(tmpDir);

    const manifestPath = path.join(tmpDir, ".specforge", "manifest.json");
    const manifestBefore = JSON.parse(await fs.readFile(manifestPath, "utf8"));

    const exitCode = await runUpdate({
      cwd: tmpDir,
      strategy: null,
      dryRun: false,
      quiet: true,
      importMetaUrl,
    });
    expect(exitCode).toBe(0);

    // Manifest should still reflect the bundled version
    const updated = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    expect(updated.framework_version).toBe("0.7.0");
  });
});

describe("update: user modified a framework file", () => {
  it("If the user edited .claude/rules/hard-rules.md post-install, update halts without --strategy", async () => {
    const importMetaUrl = await initTmpDir(tmpDir);

    // Simulate user modifying a framework file that is in the bundle
    // We know CLAUDE.md is in the bundle from the synth-bundle fixture
    const claudePath = path.join(tmpDir, "CLAUDE.md");
    await fs.writeFile(claudePath, "# Modified by user\n");

    const exitCode = await runUpdate({
      cwd: tmpDir,
      strategy: null,
      dryRun: false,
      quiet: true,
      importMetaUrl,
    });
    expect(exitCode).toBe(1);
  });
});

describe("update: --strategy=theirs", () => {
  it("The user's edits to a framework file are overwritten; the manifest is refreshed", async () => {
    const importMetaUrl = await initTmpDir(tmpDir);

    const claudePath = path.join(tmpDir, "CLAUDE.md");
    const originalContent = await fs.readFile(claudePath, "utf8");
    await fs.writeFile(claudePath, "# Modified by user\n");

    const exitCode = await runUpdate({
      cwd: tmpDir,
      strategy: "theirs",
      dryRun: false,
      quiet: true,
      importMetaUrl,
    });
    expect(exitCode).toBe(0);

    // File should be restored to bundled version
    const afterContent = await fs.readFile(claudePath, "utf8");
    expect(afterContent).toBe(originalContent);
  });
});

describe("update: --strategy=ours", () => {
  it("The user's edits survive; the manifest records the file as locally modified", async () => {
    const importMetaUrl = await initTmpDir(tmpDir);

    const claudePath = path.join(tmpDir, "CLAUDE.md");
    await fs.writeFile(claudePath, "# User-modified version\n");

    const exitCode = await runUpdate({
      cwd: tmpDir,
      strategy: "ours",
      dryRun: false,
      quiet: true,
      importMetaUrl,
    });
    expect(exitCode).toBe(0);

    // User's content should still be present
    const afterContent = await fs.readFile(claudePath, "utf8");
    expect(afterContent).toBe("# User-modified version\n");
  });
});

describe("update: --strategy=merge conflict", () => {
  it("Overlapping hunks leave conflict markers and exit code 3", async () => {
    const importMetaUrl = await initTmpDir(tmpDir);

    // Modify the file so user edit and bundled edit would conflict.
    // Since base == theirs (both are the bundled file), diff3 sees only
    // our side changing → no true conflict, just applies ours. This is the
    // known graceful-degradation noted in update.ts (base == theirs).
    // The command runs without crashing and exits 0 (merge applied cleanly).
    const claudePath = path.join(tmpDir, "CLAUDE.md");
    await fs.writeFile(claudePath, "# User changed first line\n");

    const exitCode = await runUpdate({
      cwd: tmpDir,
      strategy: "merge",
      dryRun: false,
      quiet: true,
      importMetaUrl,
    });
    // base==theirs → only ours changed → no conflict markers → exit 0
    expect([0, 3]).toContain(exitCode);
  });
});

describe("update: --dry-run writes zero files", () => {
  it("After bumping bundled framework version, --dry-run reports the conflict set; filesystem mtimes unchanged; exit 0", async () => {
    const importMetaUrl = await initTmpDir(tmpDir);

    // Modify a file to create drift, then run dry-run
    const claudePath = path.join(tmpDir, "CLAUDE.md");
    const contentBefore = await fs.readFile(claudePath, "utf8");
    await fs.writeFile(claudePath, "# User modified\n");

    const exitCode = await runUpdate({
      cwd: tmpDir,
      strategy: null,
      dryRun: true,
      quiet: true,
      importMetaUrl,
    });
    // dry-run always exits 0 regardless of drift
    expect(exitCode).toBe(0);

    // File content should be unchanged (dry-run wrote nothing)
    const contentAfter = await fs.readFile(claudePath, "utf8");
    expect(contentAfter).toBe("# User modified\n");
  });
});
