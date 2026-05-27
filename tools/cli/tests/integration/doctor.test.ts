// Rows #19, #20, #32, #33, #38, #46, #48: doctor command integration tests
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { mkTmpDir, synthBundleImportMetaUrl } from "../helpers.js";
import { runInit } from "../../src/commands/init.js";
import { runDoctor } from "../../src/commands/doctor.js";

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
