// Row #24: newer installed version refuses
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { mkTmpDir, synthBundleImportMetaUrl, writeMinimalManifest } from "../helpers.js";
import { runInit } from "../../src/commands/init.js";
import { runUpdate } from "../../src/commands/update.js";
import { runMigrate } from "../../src/commands/migrate.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkTmpDir();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("newer installed version refuses", () => {
  it("Manifest declaring framework_version newer than bundled causes every mutating command to refuse with exit 2", async () => {
    const importMetaUrl = synthBundleImportMetaUrl();
    // Bundled version is 0.7.0-rc.1; set manifest to a newer version
    await writeMinimalManifest(tmpDir, { framework_version: "99.0.0" });

    // update should refuse
    const updateCode = await runUpdate({
      cwd: tmpDir,
      strategy: null,
      dryRun: false,
      quiet: true,
      importMetaUrl,
    });
    expect(updateCode).toBe(2);

    // migrate --apply should refuse
    const migrateCode = await runMigrate({
      cwd: tmpDir,
      apply: true,
      to: null,
      allowDowngrade: false,
      acknowledgeSecurityRollback: false,
      json: false,
      dryRun: false,
      quiet: true,
      importMetaUrl,
    });
    expect(migrateCode).toBe(2);
  });
});
