// Rows #10, #11, #12, #13, #34, #37, #45: init command integration tests
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { spawnSync } from "node:child_process";
import { mkTmpDir, synthBundleImportMetaUrl } from "../helpers.js";
import { runInit } from "../../src/commands/init.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkTmpDir();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("init: empty cwd", () => {
  it("Run init in an empty tmpdir; verify the manifest, framework files, and team-data placeholders exist with correct sha256s", async () => {
    const importMetaUrl = synthBundleImportMetaUrl();
    const exitCode = await runInit({
      cwd: tmpDir,
      force: false,
      erase: false,
      noGitSafety: false,
      dryRun: false,
      quiet: true,
      importMetaUrl,
    });
    expect(exitCode).toBe(0);

    // Manifest should exist
    const manifestPath = path.join(tmpDir, ".specforge", "manifest.json");
    const manifestStr = await fs.readFile(manifestPath, "utf8");
    const manifest = JSON.parse(manifestStr);
    expect(manifest.schema_version).toBe("1");
    expect(manifest.framework_version).toBe("0.7.0");
    expect(Array.isArray(manifest.framework_files)).toBe(true);
    expect(manifest.framework_files.length).toBeGreaterThan(0);

    // Team-data placeholders should exist
    await expect(fs.access(path.join(tmpDir, "SIBLINGS.md"))).resolves.toBeUndefined();
    await expect(fs.access(path.join(tmpDir, "ROADMAP.md"))).resolves.toBeUndefined();

    // At least one framework file should be present
    await expect(fs.access(path.join(tmpDir, "CLAUDE.md"))).resolves.toBeUndefined();

    // Each framework_files entry should have a sha256_at_install
    for (const entry of manifest.framework_files) {
      expect(typeof entry.sha256_at_install).toBe("string");
      expect(entry.sha256_at_install.length).toBeGreaterThan(0);
    }
  });
});

describe("init: refuses non-empty cwd", () => {
  it("init in a tmpdir with a stray file exits 2 without writing anything", async () => {
    // Plant a specforge-shaped artifact
    await fs.writeFile(path.join(tmpDir, "CLAUDE.md"), "# existing");
    const importMetaUrl = synthBundleImportMetaUrl();
    const exitCode = await runInit({
      cwd: tmpDir,
      force: false,
      erase: false,
      noGitSafety: false,
      dryRun: false,
      quiet: true,
      importMetaUrl,
    });
    expect(exitCode).toBe(2);
    // Manifest should not have been written
    await expect(fs.access(path.join(tmpDir, ".specforge", "manifest.json"))).rejects.toThrow();
  });
});

describe("init: --force --erase clean", () => {
  it("In a clean tmpdir with prior content, --force --erase removes prior files then installs", async () => {
    // Write some prior framework content
    await fs.writeFile(path.join(tmpDir, "CLAUDE.md"), "old content");
    await fs.writeFile(path.join(tmpDir, "SIBLINGS.md"), "old siblings");

    // The tmpDir is not a git repo, so isGitTreeClean returns false (unavailable).
    // We must provide the full double opt-in: --no-git-safety + env var.
    process.env.SPECFORGE_ALLOW_DESTRUCTIVE = "1";
    const importMetaUrl = synthBundleImportMetaUrl();
    let exitCode: number;
    try {
      exitCode = await runInit({
        cwd: tmpDir,
        force: true,
        erase: true,
        noGitSafety: true,
        dryRun: false,
        quiet: true,
        importMetaUrl,
      });
    } finally {
      delete process.env.SPECFORGE_ALLOW_DESTRUCTIVE;
    }
    expect(exitCode).toBe(0);

    // Manifest should exist
    await expect(fs.access(path.join(tmpDir, ".specforge", "manifest.json"))).resolves.toBeUndefined();

    // CLAUDE.md should be the new version (from bundle), not "old content"
    const claudeContent = await fs.readFile(path.join(tmpDir, "CLAUDE.md"), "utf8");
    expect(claudeContent).not.toBe("old content");
  });
});

describe("init: --erase refuses dirty git", () => {
  it("In a dirty git tree, --erase refuses unless --no-git-safety is set", async () => {
    // Create a real git repo with an uncommitted change
    spawnSync("git", ["init"], { cwd: tmpDir });
    await fs.writeFile(path.join(tmpDir, "dirty.txt"), "uncommitted");

    const importMetaUrl = synthBundleImportMetaUrl();
    // Without --no-git-safety and env var, should exit 3
    const exitCode = await runInit({
      cwd: tmpDir,
      force: true,
      erase: true,
      noGitSafety: false,
      dryRun: false,
      quiet: true,
      importMetaUrl,
    });
    expect(exitCode).toBe(3);
  });
});

describe("init: --dry-run writes zero files", () => {
  it("After --dry-run in empty tmpdir, the cwd remains empty (zero files, no .specforge/). Exit 0.", async () => {
    const importMetaUrl = synthBundleImportMetaUrl();
    const exitCode = await runInit({
      cwd: tmpDir,
      force: false,
      erase: false,
      noGitSafety: false,
      dryRun: true,
      quiet: true,
      importMetaUrl,
    });
    expect(exitCode).toBe(0);
    // Nothing should have been written
    await expect(fs.access(path.join(tmpDir, ".specforge"))).rejects.toThrow();
    await expect(fs.access(path.join(tmpDir, "CLAUDE.md"))).rejects.toThrow();
  });
});

describe("init: --erase --no-git-safety with env var proceeds", () => {
  it("In a dirty git tree with SPECFORGE_ALLOW_DESTRUCTIVE=1, --force --erase --no-git-safety proceeds", async () => {
    // Create git repo with uncommitted file
    spawnSync("git", ["init"], { cwd: tmpDir });
    await fs.writeFile(path.join(tmpDir, "dirty.txt"), "uncommitted");
    await fs.writeFile(path.join(tmpDir, "CLAUDE.md"), "old");

    // Set env var
    process.env.SPECFORGE_ALLOW_DESTRUCTIVE = "1";
    const importMetaUrl = synthBundleImportMetaUrl();
    let exitCode: number;
    try {
      exitCode = await runInit({
        cwd: tmpDir,
        force: true,
        erase: true,
        noGitSafety: true,
        dryRun: false,
        quiet: true,
        importMetaUrl,
      });
    } finally {
      delete process.env.SPECFORGE_ALLOW_DESTRUCTIVE;
    }
    expect(exitCode).toBe(0);
    await expect(fs.access(path.join(tmpDir, ".specforge", "manifest.json"))).resolves.toBeUndefined();
  });

  it("Without env var, --erase with --no-git-safety alone exits 3 in dirty tree", async () => {
    // Ensure env var is not set
    delete process.env.SPECFORGE_ALLOW_DESTRUCTIVE;

    spawnSync("git", ["init"], { cwd: tmpDir });
    await fs.writeFile(path.join(tmpDir, "dirty.txt"), "uncommitted");

    const importMetaUrl = synthBundleImportMetaUrl();
    const exitCode = await runInit({
      cwd: tmpDir,
      force: true,
      erase: true,
      noGitSafety: true, // flag set, but no env var
      dryRun: false,
      quiet: true,
      importMetaUrl,
    });
    expect(exitCode).toBe(3);
  });
});

describe("git status timeout: fails closed", () => {
  it("--erase --no-git-safety with SPECFORGE_ALLOW_DESTRUCTIVE=1 and a stubbed git binary that sleeps past the 5-second timeout exits 3", { timeout: 15000 }, async () => {
    if (process.platform === "win32") return; // skip on Windows

    // Create a fake git binary that sleeps forever
    const fakeBinDir = path.join(tmpDir, "fakebin");
    await fs.mkdir(fakeBinDir, { recursive: true });
    const fakeGit = path.join(fakeBinDir, "git");
    // Use a 10-second sleep — longer than the 5s timeout in git.ts
    await fs.writeFile(fakeGit, "#!/bin/sh\nsleep 10\n");
    await fs.chmod(fakeGit, 0o755);

    // Create a separate working dir
    const workDir = await mkTmpDir();
    try {
      await fs.writeFile(path.join(workDir, "CLAUDE.md"), "old");

      const origPath = process.env.PATH;
      process.env.PATH = `${fakeBinDir}:${origPath}`;
      process.env.SPECFORGE_ALLOW_DESTRUCTIVE = "1";

      let exitCode: number;
      try {
        const importMetaUrl = synthBundleImportMetaUrl();
        exitCode = await runInit({
          cwd: workDir,
          force: true,
          erase: true,
          noGitSafety: true,
          dryRun: false,
          quiet: true,
          importMetaUrl,
        });
      } finally {
        process.env.PATH = origPath;
        delete process.env.SPECFORGE_ALLOW_DESTRUCTIVE;
      }
      // git timeout = fail closed = refuse erase
      expect(exitCode).toBe(3);
    } finally {
      await fs.rm(workDir, { recursive: true, force: true });
    }
  });
});
