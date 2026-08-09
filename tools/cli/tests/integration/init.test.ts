// Rows #10, #11, #12, #13, #34, #37, #45: init command integration tests
// PRD-005 § 9 row 9: init / update / migrate all start on the reduced bundle.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  mkTmpDir,
  plantSubagentDefinitions,
  subagentDefinition,
  SUBAGENT_DEFINITIONS,
  synthBundleImportMetaUrl,
} from "../helpers.js";
import { runInit } from "../../src/commands/init.js";
import { runUpdate } from "../../src/commands/update.js";
import { runMigrate } from "../../src/commands/migrate.js";
import { runPrepublish } from "../../scripts/prepublish.js";
import { validator as subagentFrontmatter } from "../../src/validators/subagent-frontmatter.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkTmpDir();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

/** Write a file (and its parents) inside the current tmpDir. */
async function plant(rel: string, contents = "planted\n"): Promise<void> {
  const abs = path.join(tmpDir, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, contents);
}

/**
 * `listEraseTargets` is module-private to init.ts; the `--erase --dry-run`
 * preview is its only observable surface, and it prints exactly the collected
 * list.
 */
async function eraseDryRunTargets(dir: string): Promise<string[]> {
  const chunks: string[] = [];
  const origWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk: any) => {
    chunks.push(String(chunk));
    return true;
  };
  let exitCode: number;
  try {
    exitCode = await runInit({
      cwd: dir,
      force: true,
      erase: true,
      noGitSafety: false,
      dryRun: true,
      quiet: false,
      importMetaUrl: synthBundleImportMetaUrl(),
    });
  } finally {
    process.stdout.write = origWrite;
  }
  expect(exitCode).toBe(0);
  return chunks
    .join("")
    .split("\n")
    .map((l) => /^\s*delete\s+(.+?)\s*$/.exec(l)?.[1])
    .filter((t): t is string => t !== undefined);
}

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

// PRD-006 § 9 row 5. The governing threat is erase blast radius: the naive
// pattern `.claude/agents/**` would make every adopter-owned subagent a
// framework file, and `init --force --erase` would delete it.
describe("init --erase: only the specforge namespace is in blast radius", () => {
  it("collects .claude/agents/specforge/* and no other file under .claude/agents/", async () => {
    await plantSubagentDefinitions(
      path.join(tmpDir, ".claude", "agents", "specforge"),
    );
    await plant(".claude/agents/custom.md", subagentDefinition("custom"));
    await plant(
      ".claude/agents/team/perf-reviewer.md",
      subagentDefinition("perf-reviewer"),
    );
    await plant(".claude/agents/specforge-lookalike/x.md");

    const targets = await eraseDryRunTargets(tmpDir);

    for (const d of SUBAGENT_DEFINITIONS) {
      expect(
        targets,
        `${d.name} must be collected`,
      ).toContain(`.claude/agents/specforge/${d.name}.md`);
    }
    for (const p of [
      ".claude/agents/custom.md",
      ".claude/agents/team/perf-reviewer.md",
      ".claude/agents/specforge-lookalike/x.md",
    ]) {
      expect(targets, `${p} must never be an erase target`).not.toContain(p);
    }
  });
});

// PRD-006 § 9 row 21. Custom reviewer roles land outside the namespace: there
// the file classifies `unknown` and dispatch works identically, because
// discovery is recursive and identity is the `name` field.
describe("init --force --erase: a team's own reviewer outside the namespace", () => {
  it("survives the erase and produces zero subagent-frontmatter findings", async () => {
    const teamFile = ".claude/agents/team/perf-reviewer.md";
    const body = subagentDefinition("perf-reviewer", "opus");
    await plant(teamFile, body);
    await plantSubagentDefinitions(
      path.join(tmpDir, ".claude", "agents", "specforge"),
    );

    process.env.SPECFORGE_ALLOW_DESTRUCTIVE = "1";
    let exitCode: number;
    try {
      exitCode = await runInit({
        cwd: tmpDir,
        force: true,
        erase: true,
        noGitSafety: true,
        dryRun: false,
        quiet: true,
        importMetaUrl: synthBundleImportMetaUrl(),
      });
    } finally {
      delete process.env.SPECFORGE_ALLOW_DESTRUCTIVE;
    }
    expect(exitCode).toBe(0);

    expect(await fs.readFile(path.join(tmpDir, teamFile), "utf8")).toBe(body);
    expect(await subagentFrontmatter.run(tmpDir)).toEqual([]);
  });
});

// PRD-006 § 9 row 26. The other side of row 21: inside the namespace the
// directory is framework-owned, and an adopter file there is invisible to
// `update` but collected by the erase.
describe("init/update: the specforge namespace is framework-owned", () => {
  it("update never reports an adopter file inside it as drift, and the erase collects it", async () => {
    const importMetaUrl = synthBundleImportMetaUrl();
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

    const helper = ".claude/agents/specforge/our-helper.md";
    await plant(helper, subagentDefinition("specforge-our-helper"));

    // `compareAll` is module-private and iterates bundle paths only, so the
    // `--dry-run` preview is where its silence is observable.
    const chunks: string[] = [];
    const origWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk: any) => {
      chunks.push(String(chunk));
      return true;
    };
    let updateCode: number;
    try {
      updateCode = await runUpdate({
        cwd: tmpDir,
        strategy: null,
        dryRun: true,
        quiet: false,
        importMetaUrl,
      });
    } finally {
      process.stdout.write = origWrite;
    }
    expect(updateCode).toBe(0);
    expect(chunks.join("")).not.toContain("our-helper.md");
    expect(chunks.join("")).toContain("0 drifted");

    expect(await eraseDryRunTargets(tmpDir)).toContain(helper);
  });
});

// PRD-006 § 9 row 30 (integration half). `safeUnlink` signals refusal by
// throwing, and the loop's previous best-effort catch swallowed everything —
// a refusal that lands in an empty catch is no defence at all.
describe("init --force --erase: a failed deletion is printed and the erase continues", () => {
  it("prints the error through the error printer, deletes the rest, and installs", async () => {
    if (process.platform === "win32") return;
    // DEVIATION from § 9 row 30's suggested inducement: a directory cannot be
    // planted "at a collected erase path", because `listEraseTargets` pushes
    // only `isFile()` dirents — a directory at a framework path is walked
    // into, never collected. A read-only parent produces what the row is
    // actually after: a genuine throw from the unlink call at a collected
    // path. Root ignores the mode bits, so skip there.
    if (process.getuid?.() === 0) return;

    await plant("examples/locked/keep.md");
    await plant("examples/deletable.md");
    const lockedDir = path.join(tmpDir, "examples", "locked");
    await fs.chmod(lockedDir, 0o555);

    const stderr: string[] = [];
    const origErr = process.stderr.write.bind(process.stderr);
    process.stderr.write = (chunk: any) => {
      stderr.push(String(chunk));
      return true;
    };
    process.env.SPECFORGE_ALLOW_DESTRUCTIVE = "1";
    let exitCode: number;
    try {
      exitCode = await runInit({
        cwd: tmpDir,
        force: true,
        erase: true,
        noGitSafety: true,
        dryRun: false,
        quiet: true,
        importMetaUrl: synthBundleImportMetaUrl(),
      });
    } finally {
      process.stderr.write = origErr;
      delete process.env.SPECFORGE_ALLOW_DESTRUCTIVE;
      await fs.chmod(lockedDir, 0o755);
    }

    const printed = stderr.join("");
    expect(printed).toContain("could not delete");
    expect(printed).toContain("examples/locked/keep.md");
    // The refused target survives; every other target was still deleted; and
    // the install itself ran to completion.
    await expect(
      fs.access(path.join(tmpDir, "examples", "locked", "keep.md")),
    ).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(tmpDir, "examples", "deletable.md")),
    ).rejects.toThrow();
    expect(exitCode).toBe(0);
    await expect(
      fs.access(path.join(tmpDir, ".specforge", "manifest.json")),
    ).resolves.toBeUndefined();
  });
});

describe("init / update / migrate on a prepublish-built bundle", () => {
  const REPO_ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../..",
  );
  const VACATED = [
    "CHANGELOG.md",
    "VERSION",
    "docs",
    "mkdocs.yml",
    "requirements-docs.txt",
    "scripts/upgrade.sh",
    ".github/workflows/cli-release.yml",
  ];

  let pkgDir: string;

  beforeEach(async () => {
    pkgDir = await mkTmpDir();
    await fs.writeFile(
      path.join(pkgDir, "package.json"),
      JSON.stringify({ name: "@angelkurten/specforge", version: "0.0.0" }, null, 2) + "\n",
    );
    expect(await runPrepublish({ repoRoot: REPO_ROOT, cliRoot: pkgDir })).toBe(0);
  });

  afterEach(async () => {
    await fs.rm(pkgDir, { recursive: true, force: true });
  });

  it("each command resolves its version and completes; no project metadata is installed", async () => {
    const importMetaUrl = pathToFileURL(path.join(pkgDir, "dist", "cli.js")).href;
    const bundleVer = (await fs.readFile(path.join(REPO_ROOT, "VERSION"), "utf8")).trim();

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

    const manifest = JSON.parse(
      await fs.readFile(path.join(tmpDir, ".specforge", "manifest.json"), "utf8"),
    );
    expect(manifest.framework_version).toBe(bundleVer);
    expect(manifest.framework_files).toHaveLength(32);
    await expect(fs.access(path.join(tmpDir, "CLAUDE.md"))).resolves.toBeUndefined();

    // PRD-006 § 9 row 8: the 12 definitions land on disk and in the manifest.
    const tracked = manifest.framework_files.map((f: { path: string }) => f.path);
    for (const d of SUBAGENT_DEFINITIONS) {
      const rel = `.claude/agents/specforge/${d.name}.md`;
      await expect(
        fs.access(path.join(tmpDir, rel)),
        `${rel} must be installed`,
      ).resolves.toBeUndefined();
      expect(tracked, `${rel} must be tracked in the manifest`).toContain(rel);
    }
    // And nothing from the vacated layout.
    await expect(fs.access(path.join(tmpDir, "agents"))).rejects.toThrow();
    for (const p of VACATED) {
      await expect(
        fs.access(path.join(tmpDir, p)),
        `${p} must not be installed`,
      ).rejects.toThrow();
    }

    expect(
      await runUpdate({
        cwd: tmpDir,
        strategy: null,
        dryRun: false,
        quiet: true,
        importMetaUrl,
      }),
    ).toBe(0);

    expect(
      await runMigrate({
        cwd: tmpDir,
        apply: true,
        to: null,
        allowDowngrade: false,
        acknowledgeSecurityRollback: false,
        json: false,
        dryRun: false,
        quiet: true,
        importMetaUrl,
      }),
    ).toBe(0);
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
