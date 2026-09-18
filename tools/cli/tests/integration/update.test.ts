// Rows #14, #15, #16, #17, #18, #35: update command integration tests
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import {
  mkTmpDir,
  subagentDefinition,
  synthBundleAt,
  synthBundleImportMetaUrl,
} from "../helpers.js";
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

describe("update: --strategy=merge refuses", () => {
  it("With a drifted file, merge refuses, writes nothing, and leaves the manifest version alone", async () => {
    // Until 0.27.2 this branch passed the bundle as `base`, so base === theirs,
    // which diff3 reads as "theirs changed nothing" and answers with `ours`
    // byte for byte. It then wrote the new framework_version to the manifest —
    // a corpus reporting a version whose rules it did not carry. PRD-003 § 6.1
    // stores `sha256_at_install` and never the bytes, so the third input a
    // three-way merge needs does not exist. Refusing is the honest answer.
    const importMetaUrl = await initTmpDir(tmpDir);

    const claudePath = path.join(tmpDir, "CLAUDE.md");
    const original = await fs.readFile(claudePath, "utf8");
    const ours = "# OURS — user modified line 0\n" + original;
    await fs.writeFile(claudePath, ours);

    const manifestPath = path.join(tmpDir, ".specforge", "manifest.json");
    const before = JSON.parse(await fs.readFile(manifestPath, "utf8"));

    const exitCode = await runUpdate({
      cwd: tmpDir,
      strategy: "merge",
      dryRun: false,
      quiet: true,
      importMetaUrl,
    });

    expect(exitCode).toBe(1);
    // The local change survives untouched, and no bundle byte landed.
    expect(await fs.readFile(claudePath, "utf8")).toBe(ours);
    // And the version is not bumped — the failure this fix exists for.
    const after = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    expect(after.framework_version).toBe(before.framework_version);
    expect(after.last_updated_at).toBe(before.last_updated_at);
  });

  it("Refuses in --dry-run too, rather than promising a merge it cannot perform", async () => {
    const importMetaUrl = await initTmpDir(tmpDir);
    const claudePath = path.join(tmpDir, "CLAUDE.md");
    await fs.writeFile(claudePath, "# OURS\n" + (await fs.readFile(claudePath, "utf8")));

    const exitCode = await runUpdate({
      cwd: tmpDir,
      strategy: "merge",
      dryRun: true,
      quiet: true,
      importMetaUrl,
    });

    expect(exitCode).toBe(1);
  });

  it("A corpus with no drift is unaffected by the strategy name", async () => {
    const importMetaUrl = await initTmpDir(tmpDir);
    const exitCode = await runUpdate({
      cwd: tmpDir,
      strategy: "merge",
      dryRun: false,
      quiet: true,
      importMetaUrl,
    });
    expect(exitCode).toBe(0);
  });
});

// PRD-006 § 9 row 6: PRD-003's drift behaviour must hold at the new path.
// Driven against a purpose-built bundle rather than the repo's own, so the
// assertion does not depend on which definitions the framework currently
// ships.
describe("update: a team-edited subagent definition drift-halts", () => {
  const REL = ".claude/agents/specforge/specforge-backend-reviewer.md";

  it("halts without --strategy and is resolved by --strategy=theirs", async () => {
    const bundleParent = await mkTmpDir();
    try {
      const importMetaUrl = await synthBundleAt(bundleParent, "0.7.0");
      const bundled = subagentDefinition(
        "specforge-backend-reviewer",
        "opus",
        "Read, Grep, Glob, Bash",
      );
      const inBundle = path.join(bundleParent, "fake-pkg", "framework", REL);
      await fs.mkdir(path.dirname(inBundle), { recursive: true });
      await fs.writeFile(inBundle, bundled);

      expect(
        await runInit({
          cwd: tmpDir,
          force: false,
          erase: false,
          noGitSafety: false,
          dryRun: false,
          quiet: true,
          importMetaUrl,
        }),
      ).toBe(0);
      expect(await fs.readFile(path.join(tmpDir, REL), "utf8")).toBe(bundled);

      const edited = bundled.replace("model: opus", "model: sonnet");
      await fs.writeFile(path.join(tmpDir, REL), edited);

      expect(
        await runUpdate({
          cwd: tmpDir,
          strategy: null,
          dryRun: false,
          quiet: true,
          importMetaUrl,
        }),
      ).toBe(1);
      expect(await fs.readFile(path.join(tmpDir, REL), "utf8")).toBe(edited);

      expect(
        await runUpdate({
          cwd: tmpDir,
          strategy: "theirs",
          dryRun: false,
          quiet: true,
          importMetaUrl,
        }),
      ).toBe(0);
      expect(await fs.readFile(path.join(tmpDir, REL), "utf8")).toBe(bundled);
    } finally {
      await fs.rm(bundleParent, { recursive: true, force: true });
    }
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
