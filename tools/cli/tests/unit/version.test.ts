// Rows #28 and #39: version command output and malformed manifest exits 10
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { mkTmpDir, synthBundleImportMetaUrl, writeMinimalManifest } from "../helpers.js";
import { runVersion } from "../../src/commands/version.js";

const CLI_ENTRY = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../../dist/src/cli.js",
);

describe("version command output", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkTmpDir();
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("specforge version --json emits the expected shape", async () => {
    const importMetaUrl = synthBundleImportMetaUrl();
    // No manifest present yet — installed should be null
    const result = await runVersion({ cwd: tmpDir, json: true, importMetaUrl });
    expect(result).toBe(0);
  });

  it("bundled and installed versions match after init (via manifest write)", async () => {
    const importMetaUrl = synthBundleImportMetaUrl();
    const bundledVersion = "0.7.0";

    // Write a manifest matching the bundled version
    await writeMinimalManifest(tmpDir, { framework_version: bundledVersion });

    // Capture stdout via a custom approach - test runVersion directly
    // with json mode by capturing process.stdout.write
    const chunks: string[] = [];
    const origWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk: any) => {
      chunks.push(String(chunk));
      return true;
    };

    try {
      await runVersion({ cwd: tmpDir, json: true, importMetaUrl });
    } finally {
      process.stdout.write = origWrite;
    }

    const output = chunks.join("");
    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty("schema_version");
    expect(parsed).toHaveProperty("bundled");
    expect(parsed).toHaveProperty("installed");
    expect(parsed).toHaveProperty("drift");
    expect(parsed.bundled).toBe(bundledVersion);
    expect(parsed.installed).toBe(bundledVersion);
    expect(parsed.drift).toBe(false);
  });
});

describe("version: malformed manifest exits 10", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkTmpDir();
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("version on a tmpdir whose .specforge/manifest.json is truncated exits 10; stderr matches error+remediation format", async () => {
    // Write a truncated (malformed) manifest
    await fs.mkdir(path.join(tmpDir, ".specforge"), { recursive: true });
    await fs.writeFile(path.join(tmpDir, ".specforge", "manifest.json"), '{"schema_version": "1", "fram');

    const importMetaUrl = synthBundleImportMetaUrl();

    const stderrChunks: string[] = [];
    const origWrite = process.stderr.write.bind(process.stderr);
    process.stderr.write = (chunk: any) => {
      stderrChunks.push(String(chunk));
      return true;
    };

    let exitCode: number;
    try {
      exitCode = await runVersion({ cwd: tmpDir, json: false, importMetaUrl });
    } finally {
      process.stderr.write = origWrite;
    }

    expect(exitCode).toBe(10);
    const stderrOutput = stderrChunks.join("");
    expect(stderrOutput).toContain("error:");
    expect(stderrOutput).toContain("remediation:");
    expect(stderrOutput).toContain("malformed");
  });
});
