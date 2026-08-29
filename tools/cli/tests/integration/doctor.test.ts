// Rows #19, #20, #32, #33, #38, #46, #48: doctor command integration tests
// PRD-005 § 9 row 13: an install carrying the seven vacated paths gains no
// doctor findings after updating onto the reduced bundle.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  mkTmpDir,
  plantSubagentDefinitions,
  subagentDefinition,
  synthBundleImportMetaUrl,
} from "../helpers.js";
import { runInit } from "../../src/commands/init.js";
import { runUpdate } from "../../src/commands/update.js";
import { runDoctor } from "../../src/commands/doctor.js";
import { runPrepublish } from "../../scripts/prepublish.js";
import { sha256OfFile } from "../../src/sha.js";
import { ALL_VALIDATORS } from "../../src/validators/index.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkTmpDir();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

async function doInit(dir: string) {
  const importMetaUrl = synthBundleImportMetaUrl();
  await runInit({ cwd: dir, force: false, erase: false, noGitSafety: false, dryRun: false, quiet: true, importMetaUrl });
  return importMetaUrl;
}

describe("doctor: clean install passes", () => {
  it("Immediately after init, doctor exits 0", async () => {
    const importMetaUrl = await doInit(tmpDir);
    const exitCode = await runDoctor({
      cwd: tmpDir,
      json: false,
      rules: [],
      ignoreSiblings: [],
      quiet: true,
      importMetaUrl,
    });
    expect(exitCode).toBe(0);
  });
});

describe("doctor: synthetic gate-block violation", () => {
  it("A planted PRD with tests: [TBD] (Implemented) produces a gate-block-yaml failure", async () => {
    const importMetaUrl = await doInit(tmpDir);

    const badPrd = `# PRD-001

**Status**: Implemented

## Impacted Projects

| Project | Impact |
|---|---|
| specforge | test |

## 1. Problem Statement
## 2. Goals
## 3. Non-Goals
## 4. User Flows
## 5. API
## 6. Data Model
## 7. Architecture
## 8. Security
## 9. Test Plan
## 10. Migration Plan
## 11. Open Questions

## Gate: Promotion to \`Implemented\`

\`\`\`yaml
commit_hash: abc123
tests:
  - '[TBD]'
system_artifact_diff:
  - '../sibling/docs/SYSTEM_ARTIFACT.md#section (commit abc123)'
\`\`\`
`;
    await fs.writeFile(path.join(tmpDir, "001-bad.md"), badPrd);

    const exitCode = await runDoctor({
      cwd: tmpDir,
      json: false,
      rules: ["gate-block-yaml"],
      ignoreSiblings: [],
      quiet: true,
      importMetaUrl,
    });
    expect(exitCode).toBeGreaterThan(0);
  });
});

describe("doctor: --ignore-sibling skips named sibling", () => {
  it("A sibling whose Path does not resolve passes doctor --ignore-sibling=<name>; the exclusion appears in output for audit", async () => {
    const importMetaUrl = await doInit(tmpDir);

    // Write a SIBLINGS.md with a non-resolving path
    await fs.writeFile(
      path.join(tmpDir, "SIBLINGS.md"),
      `# Siblings\n\n| Name | Path | Status | Read first |\n|---|---|---|---|\n| web-client | ../does-not-exist | active | README.md |\n`,
    );

    const chunks: string[] = [];
    const origWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk: any) => { chunks.push(String(chunk)); return true; };

    let exitCode: number;
    try {
      exitCode = await runDoctor({
        cwd: tmpDir,
        json: true,
        rules: ["siblings-paths-resolve"],
        ignoreSiblings: ["web-client"],
        quiet: false,
        importMetaUrl,
      });
    } finally {
      process.stdout.write = origWrite;
    }

    const output = JSON.parse(chunks.join(""));
    expect(output.exclusions.siblings).toContain("web-client");
    // Should pass because the sibling is ignored
    expect(exitCode).toBe(0);
  });
});

describe("doctor: --ignore-sibling with unknown name fails", () => {
  it("--ignore-sibling=does-not-exist is itself a siblings-paths-resolve failure", async () => {
    const importMetaUrl = await doInit(tmpDir);

    await fs.writeFile(
      path.join(tmpDir, "SIBLINGS.md"),
      `# Siblings\n\n| Name | Path | Status | Read first |\n|---|---|---|---|\n`,
    );

    const exitCode = await runDoctor({
      cwd: tmpDir,
      json: false,
      rules: ["siblings-paths-resolve"],
      ignoreSiblings: ["does-not-exist"],
      quiet: true,
      importMetaUrl,
    });
    expect(exitCode).toBeGreaterThan(0);
  });
});

describe("doctor: --rule filters validators", () => {
  it("doctor --rule=prd-numbering runs exactly that validator; --rule=does-not-exist exits 2", async () => {
    const importMetaUrl = await doInit(tmpDir);

    // Running with a specific rule should only report that rule
    const chunks: string[] = [];
    const origWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk: any) => { chunks.push(String(chunk)); return true; };
    let exitCode: number;
    try {
      exitCode = await runDoctor({
        cwd: tmpDir,
        json: true,
        rules: ["prd-numbering"],
        ignoreSiblings: [],
        quiet: false,
        importMetaUrl,
      });
    } finally {
      process.stdout.write = origWrite;
    }
    const output = JSON.parse(chunks.join(""));
    expect(output.validators_run).toEqual(["prd-numbering"]);
    expect(exitCode).toBe(0);

    // Unknown rule should exit 2
    const stderrChunks: string[] = [];
    const origErr = process.stderr.write.bind(process.stderr);
    process.stderr.write = (chunk: any) => { stderrChunks.push(String(chunk)); return true; };
    let exitCode2: number;
    try {
      exitCode2 = await runDoctor({
        cwd: tmpDir,
        json: false,
        rules: ["does-not-exist"],
        ignoreSiblings: [],
        quiet: true,
        importMetaUrl,
      });
    } finally {
      process.stderr.write = origErr;
    }
    expect(exitCode2).toBe(2);
  });
});

describe("framework-file-integrity validator", () => {
  it("Modify an installed framework file post-init; with installed_framework_version == bundled, doctor flags framework-file-integrity failure", async () => {
    const importMetaUrl = await doInit(tmpDir);

    // Modify a framework file
    const claudePath = path.join(tmpDir, "CLAUDE.md");
    await fs.writeFile(claudePath, "# Tampered content\n");

    const exitCode = await runDoctor({
      cwd: tmpDir,
      json: false,
      rules: ["framework-file-integrity"],
      ignoreSiblings: [],
      quiet: true,
      importMetaUrl,
    });
    expect(exitCode).toBeGreaterThan(0);
  });

  it("Bump bundled version; the validator no-ops", async () => {
    const importMetaUrl = await doInit(tmpDir);

    // Change the manifest to report a different installed version
    const manifestPath = path.join(tmpDir, ".specforge", "manifest.json");
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    manifest.framework_version = "0.6.0"; // older than bundled 0.7.0-rc.1
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    // Modify a framework file
    await fs.writeFile(path.join(tmpDir, "CLAUDE.md"), "# Tampered\n");

    const exitCode = await runDoctor({
      cwd: tmpDir,
      json: false,
      rules: ["framework-file-integrity"],
      ignoreSiblings: [],
      quiet: true,
      importMetaUrl,
    });
    // When versions differ, validator no-ops → 0 errors
    expect(exitCode).toBe(0);
  });
});

describe("doctor: a pre-0.10.0 install carrying the vacated paths stays clean", () => {
  const REPO_ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../..",
  );
  const LEGACY_PATHS = [
    "CHANGELOG.md",
    "VERSION",
    "mkdocs.yml",
    "requirements-docs.txt",
    "docs/faq.md",
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

  it("update then doctor reports 0 findings across every validator, exit 0", async () => {
    const importMetaUrl = pathToFileURL(path.join(pkgDir, "dist", "cli.js")).href;

    // Install the retained set, then reshape the result into what a pre-0.10.0
    // install looks like: an older framework_version, the seven paths on disk,
    // and manifest entries claiming them as framework files.
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

    const manifestPath = path.join(tmpDir, ".specforge", "manifest.json");
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    // Any version older than the bundle's: the point is that the install
    // predates the release that vacated these paths.
    manifest.framework_version = "0.8.0";
    for (const rel of LEGACY_PATHS) {
      const abs = path.join(tmpDir, rel);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, `legacy ${rel}\n`);
      manifest.framework_files.push({
        path: rel,
        sha256_at_install: await sha256OfFile(abs),
      });
    }
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

    expect(
      await runUpdate({
        cwd: tmpDir,
        strategy: null,
        dryRun: false,
        quiet: true,
        importMetaUrl,
      }),
    ).toBe(0);

    // The stale entries drop out of the manifest as a side effect; the files
    // themselves are neither refreshed nor deleted.
    const after = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    const trackedPaths = after.framework_files.map((f: { path: string }) => f.path);
    for (const rel of LEGACY_PATHS) {
      expect(trackedPaths, `${rel} must leave framework_files`).not.toContain(rel);
      await expect(
        fs.access(path.join(tmpDir, rel)),
        `${rel} must survive update`,
      ).resolves.toBeUndefined();
    }

    const chunks: string[] = [];
    const origWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk: any) => { chunks.push(String(chunk)); return true; };
    let exitCode: number;
    try {
      exitCode = await runDoctor({
        cwd: tmpDir,
        json: true,
        rules: [],
        ignoreSiblings: [],
        quiet: false,
        importMetaUrl,
      });
    } finally {
      process.stdout.write = origWrite;
    }

    const report = JSON.parse(chunks.join(""));
    expect(report.validators_run).toHaveLength(ALL_VALIDATORS.length);
    expect(report.findings).toEqual([]);
    expect(exitCode).toBe(0);
  });
});

/** Run doctor in JSON mode and return the parsed report plus the exit code. */
async function doctorJson(
  dir: string,
  importMetaUrl: string,
  rules: string[] = [],
): Promise<{ report: any; exitCode: number }> {
  const chunks: string[] = [];
  const origWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk: any) => {
    chunks.push(String(chunk));
    return true;
  };
  let exitCode: number;
  try {
    exitCode = await runDoctor({
      cwd: dir,
      json: true,
      rules,
      ignoreSiblings: [],
      quiet: false,
      importMetaUrl,
    });
  } finally {
    process.stdout.write = origWrite;
  }
  return { report: JSON.parse(chunks.join("")), exitCode };
}

// PRD-006 § 9 row 9. PRD-005's orphan behaviour, at this PRD's paths: the
// manifest entries drop out when `framework_files` is rebuilt from the bundle,
// and the files themselves are neither refreshed nor deleted (`update` has no
// deletion path).
describe("update: stale agents/ manifest entries drop, the files survive", () => {
  it("removes the entries from framework_files and leaves the bytes on disk", async () => {
    const importMetaUrl = await doInit(tmpDir);
    const stale = ["agents/backend-reviewer.md", "agents/roadmap-risk-critic.md"];

    const manifestPath = path.join(tmpDir, ".specforge", "manifest.json");
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    for (const rel of stale) {
      const abs = path.join(tmpDir, rel);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, `stale briefing ${rel}\n`);
      manifest.framework_files.push({
        path: rel,
        sha256_at_install: await sha256OfFile(abs),
      });
    }
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

    expect(
      await runUpdate({
        cwd: tmpDir,
        strategy: null,
        dryRun: false,
        quiet: true,
        importMetaUrl,
      }),
    ).toBe(0);

    const after = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    const tracked = after.framework_files.map((f: { path: string }) => f.path);
    for (const rel of stale) {
      expect(tracked, `${rel} must leave framework_files`).not.toContain(rel);
      expect(await fs.readFile(path.join(tmpDir, rel), "utf8")).toBe(
        `stale briefing ${rel}\n`,
      );
    }
  });
});

// PRD-006 § 9 rows 10 and 11.
describe("doctor validator: stale-briefings", () => {
  it("fires once, names both paths and the cleanup, and does not change the exit code", async () => {
    const importMetaUrl = await doInit(tmpDir);
    await plantSubagentDefinitions(
      path.join(tmpDir, ".claude", "agents", "specforge"),
    );
    await fs.mkdir(path.join(tmpDir, "agents"), { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, "agents", "backend-reviewer.md"),
      "# stale briefing\n",
    );
    await fs.writeFile(
      path.join(tmpDir, "agents", "roadmap-market-generator.md"),
      "# stale briefing\n",
    );

    const { report, exitCode } = await doctorJson(tmpDir, importMetaUrl, [
      "stale-briefings",
    ]);

    expect(report.findings).toHaveLength(1);
    const f = report.findings[0];
    expect(f.severity).toBe("warning");
    expect(f.message).toContain("agents/backend-reviewer.md");
    expect(f.message).toContain("agents/roadmap-market-generator.md");
    expect(f.message).toContain(".claude/agents/specforge/");
    expect(f.message).toContain("0.11.0");
    // Warning severity: CI gated on `doctor` must not fail on it.
    expect(exitCode).toBe(0);
  });

  it("stays silent unless both halves of the condition hold", async () => {
    const importMetaUrl = await doInit(tmpDir);

    // (a) fresh install, no `agents/` at all.
    expect(
      (await doctorJson(tmpDir, importMetaUrl, ["stale-briefings"])).report.findings,
    ).toEqual([]);

    // (b) the new tree without the old one.
    await plantSubagentDefinitions(
      path.join(tmpDir, ".claude", "agents", "specforge"),
    );
    expect(
      (await doctorJson(tmpDir, importMetaUrl, ["stale-briefings"])).report.findings,
    ).toEqual([]);

    // (c) an unrelated file under `agents/` is not a briefing.
    await fs.mkdir(path.join(tmpDir, "agents"), { recursive: true });
    await fs.writeFile(path.join(tmpDir, "agents", "notes.md"), "# team notes\n");
    expect(
      (await doctorJson(tmpDir, importMetaUrl, ["stale-briefings"])).report.findings,
    ).toEqual([]);
  });
});

// PRD-006 § 9 row 22. The shadowing control is the validator, not the prefix
// convention and not the host's duplicate-name resolution — and it is
// detective: a shadow is caught when `doctor` runs, not at dispatch time.
describe("doctor validator: subagent-frontmatter reserved-prefix shadow", () => {
  it("reports one error for a specforge-named file outside the namespace", async () => {
    const importMetaUrl = await doInit(tmpDir);
    await plantSubagentDefinitions(
      path.join(tmpDir, ".claude", "agents", "specforge"),
    );
    const shadow = ".claude/agents/specforge-security-reviewer.md";
    await fs.writeFile(
      path.join(tmpDir, shadow),
      subagentDefinition("specforge-security-reviewer", "opus"),
    );

    const { report, exitCode } = await doctorJson(tmpDir, importMetaUrl, [
      "subagent-frontmatter",
    ]);

    expect(report.findings).toHaveLength(1);
    expect(report.findings[0].severity).toBe("error");
    expect(report.findings[0].file).toBe(shadow);
    expect(report.findings[0].message).toContain("specforge-");
    // An error changes the exit code, which is what makes gated CI fail.
    expect(exitCode).toBeGreaterThan(0);
  });

  it("reports a symlinked shadow additively: the symlink finding and the class-2 error", async () => {
    if (process.platform === "win32") return;
    const importMetaUrl = await doInit(tmpDir);
    await plantSubagentDefinitions(
      path.join(tmpDir, ".claude", "agents", "specforge"),
    );
    await fs.writeFile(
      path.join(tmpDir, "evil.md"),
      subagentDefinition("specforge-security-reviewer", "opus"),
    );
    // A walk modelled on the codebase's others (isFile()/isDirectory()) would
    // drop this dirent silently while Claude Code reads it normally.
    await fs.symlink(
      "../../evil.md",
      path.join(tmpDir, ".claude", "agents", "x.md"),
    );

    const { report, exitCode } = await doctorJson(tmpDir, importMetaUrl, [
      "subagent-frontmatter",
    ]);

    expect(report.findings).toHaveLength(2);
    const link = report.findings.find((f: any) => f.severity === "warning");
    expect(link, "the symlink itself must be reported, never silently skipped").toBeDefined();
    expect(link.file).toBe(".claude/agents/x.md");
    expect(link.message).toContain("../../evil.md");

    const shadow = report.findings.find((f: any) => f.severity === "error");
    expect(
      shadow,
      "a terminal symlink finding alone would re-open the evasion one severity notch down",
    ).toBeDefined();
    expect(shadow.file).toBe(".claude/agents/x.md");
    expect(shadow.message).toContain("specforge-");
    expect(exitCode).toBeGreaterThan(0);
  });

  it("traverses a symlinked directory and reports the shadow hidden inside it", async () => {
    if (process.platform === "win32") return;
    const importMetaUrl = await doInit(tmpDir);
    await plantSubagentDefinitions(
      path.join(tmpDir, ".claude", "agents", "specforge"),
    );
    // A shadow behind a symlinked *directory*: warning-only on the link
    // without descending leaves doctor's exit code at 0 — reopening exactly
    // the evasion §5.4's exit-code reasoning rejects. The validator must
    // traverse the link (cycle-bounded by a realpath visited-set) and surface
    // the class-2 error inside it.
    await fs.mkdir(path.join(tmpDir, "hidden"), { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, "hidden", "specforge-security-reviewer.md"),
      subagentDefinition("specforge-security-reviewer", "opus"),
    );
    await fs.symlink(
      "../../hidden",
      path.join(tmpDir, ".claude", "agents", "team"),
    );

    const { report, exitCode } = await doctorJson(tmpDir, importMetaUrl, [
      "subagent-frontmatter",
    ]);

    const link = report.findings.find(
      (f: any) => f.severity === "warning" && f.file === ".claude/agents/team",
    );
    expect(link, "the symlinked directory itself must be reported").toBeDefined();
    expect(link.message).toContain("../../hidden");

    const shadow = report.findings.find((f: any) => f.severity === "error");
    expect(
      shadow,
      "a shadow behind a symlinked directory must produce the class-2 error",
    ).toBeDefined();
    expect(shadow.file).toBe(
      ".claude/agents/team/specforge-security-reviewer.md",
    );
    expect(shadow.message).toContain("specforge-");
    // The error is what moves doctor's exit code off 0 so gated CI fails.
    expect(exitCode).toBeGreaterThan(0);
  });

  it("a symlinked namespace ROOT produces an error, not a warning, and moves the exit code", async () => {
    if (process.platform === "win32") return;
    const importMetaUrl = await doInit(tmpDir);
    // Forged framework definitions live outside the integrity-checked
    // namespace; each one is schema-valid on its own.
    await fs.mkdir(path.join(tmpDir, "evil"), { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, "evil", "security-reviewer.md"),
      subagentDefinition("specforge-security-reviewer", "opus"),
    );
    // Plant the namespace ROOT itself (no trailing slash) as a symlink. Its
    // children carry the trailing slash and pass class 1 cleanly under forged
    // framework names, so only the root's OWN finding can move the exit code —
    // and it must be an error (inside branch), not a warning.
    await fs.mkdir(path.join(tmpDir, ".claude", "agents"), { recursive: true });
    await fs.symlink(
      "../../evil",
      path.join(tmpDir, ".claude", "agents", "specforge"),
    );

    const { report, exitCode } = await doctorJson(tmpDir, importMetaUrl, [
      "subagent-frontmatter",
    ]);

    const root = report.findings.find(
      (f: any) => f.file === ".claude/agents/specforge",
    );
    expect(
      root,
      "the symlinked namespace root itself must be reported",
    ).toBeDefined();
    expect(
      root.severity,
      "the root takes the inside branch, so a symlinked root is an error",
    ).toBe("error");
    expect(root.message).toContain("../../evil");
    // The forged child passes class 1; the root's error is what fails gated CI.
    expect(exitCode).toBeGreaterThan(0);
  });

  it("a mirror sorting ahead of the real namespace does not preempt its class-1 coverage", async () => {
    if (process.platform === "win32") return;
    const importMetaUrl = await doInit(tmpDir);
    // A correct install (14 valid defs) plus one schema-invalid def inside the
    // real namespace: a concrete model ID is rejected by class 1.
    await plantSubagentDefinitions(
      path.join(tmpDir, ".claude", "agents", "specforge"),
    );
    await fs.writeFile(
      path.join(tmpDir, ".claude", "agents", "specforge", "specforge-bad.md"),
      subagentDefinition("specforge-bad", "claude-opus-5"),
    );
    // `aaa-mirror` sorts before `specforge`. If the mirror is walked first it
    // registers the namespace's realpath and the real directory is
    // short-circuited when reached — dropping class-1 coverage on the real path
    // and producing spurious class-2 errors against the mirror. The fix walks
    // the canonical (non-symlink) directory first.
    await fs.symlink(
      "./specforge",
      path.join(tmpDir, ".claude", "agents", "aaa-mirror"),
    );

    const { report, exitCode } = await doctorJson(tmpDir, importMetaUrl, [
      "subagent-frontmatter",
    ]);

    const errors = report.findings.filter((f: any) => f.severity === "error");
    // The class-1 error fires against the REAL namespace path...
    expect(
      errors.find(
        (f: any) => f.file === ".claude/agents/specforge/specforge-bad.md",
      ),
      "class-1 must fire against the real namespace path",
    ).toBeDefined();
    // ...and nowhere else: no spurious duplication against the mirror, and the
    // 14 valid defs stay clean.
    expect(
      errors.filter((f: any) =>
        f.file.startsWith(".claude/agents/aaa-mirror"),
      ),
      "the mirror must not be re-descended into spurious errors",
    ).toEqual([]);
    expect(errors).toHaveLength(1);
    // The mirror symlink itself is still reported (refuse-don't-skip), as a
    // warning that does not change the exit code.
    const link = report.findings.find(
      (f: any) =>
        f.severity === "warning" && f.file === ".claude/agents/aaa-mirror",
    );
    expect(link, "the mirror symlink itself must be reported").toBeDefined();
    expect(exitCode).toBeGreaterThan(0);
  });

  it("stays silent on a correct install", async () => {
    const importMetaUrl = await doInit(tmpDir);
    await plantSubagentDefinitions(
      path.join(tmpDir, ".claude", "agents", "specforge"),
    );
    const { report, exitCode } = await doctorJson(tmpDir, importMetaUrl, [
      "subagent-frontmatter",
    ]);
    expect(report.findings).toEqual([]);
    expect(exitCode).toBe(0);
  });
});

// PRD-006 § 9 row 13: the registry grows by two, and `validators_run`
// self-adjusts rather than pinning a literal count.
describe("doctor: validator registry", () => {
  it("runs every registered validator, including the two PRD-006 additions", async () => {
    const importMetaUrl = await doInit(tmpDir);
    const { report } = await doctorJson(tmpDir, importMetaUrl);
    expect(report.validators_run).toHaveLength(ALL_VALIDATORS.length);
    expect(report.validators_run).toContain("stale-briefings");
    expect(report.validators_run).toContain("subagent-frontmatter");
  });
});

describe("doctor: --json exclusions echoed", () => {
  it("doctor --json --ignore-sibling=web-client emits exclusions.siblings: ['web-client'] in the JSON output", async () => {
    const importMetaUrl = await doInit(tmpDir);

    await fs.writeFile(
      path.join(tmpDir, "SIBLINGS.md"),
      `# Siblings\n\n| Name | Path | Status | Read first |\n|---|---|---|---|\n| web-client | ../does-not-exist | active | README.md |\n`,
    );

    const chunks: string[] = [];
    const origWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk: any) => { chunks.push(String(chunk)); return true; };

    try {
      await runDoctor({
        cwd: tmpDir,
        json: true,
        rules: [],
        ignoreSiblings: ["web-client"],
        quiet: false,
        importMetaUrl,
      });
    } finally {
      process.stdout.write = origWrite;
    }

    const output = JSON.parse(chunks.join(""));
    expect(output.exclusions).toBeDefined();
    expect(output.exclusions.siblings).toContain("web-client");
  });
});
