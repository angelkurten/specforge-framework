// Rows #21, #22, #29, #30, #31, #40, #47, #56: migrate command integration tests
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { mkTmpDir, synthBundleAt, synthBundleImportMetaUrl, writeMinimalManifest } from "../helpers.js";
import { runMigrate } from "../../src/commands/migrate.js";
import { makeTestMigration } from "../../src/migrations-registry.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkTmpDir();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

async function setupManifest(dir: string, version: string) {
  await writeMinimalManifest(dir, { framework_version: version });
}

describe("migrate: dry-run lists steps", () => {
  it("migrate without --apply prints the migration list and does not mutate files", async () => {
    await setupManifest(tmpDir, "0.6.0");
    const importMetaUrl = synthBundleImportMetaUrl();

    const chunks: string[] = [];
    const origWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk: any) => { chunks.push(String(chunk)); return true; };
    let exitCode: number;
    try {
      exitCode = await runMigrate({
        cwd: tmpDir,
        apply: false,
        to: null,
        allowDowngrade: false,
        acknowledgeSecurityRollback: false,
        json: false,
        dryRun: false,
        quiet: false,
        importMetaUrl,
      });
    } finally {
      process.stdout.write = origWrite;
    }

    expect(exitCode).toBe(0);
    // Manifest should still show 0.6.0 (no mutation)
    const manifest = JSON.parse(
      await fs.readFile(path.join(tmpDir, ".specforge", "manifest.json"), "utf8"),
    );
    expect(manifest.framework_version).toBe("0.6.0");
  });
});

describe("migrate: --apply mutates idempotently", () => {
  it("Running --apply twice produces the same result as running it once", async () => {
    await setupManifest(tmpDir, "0.6.0");
    const importMetaUrl = synthBundleImportMetaUrl();

    await runMigrate({ cwd: tmpDir, apply: true, to: null, allowDowngrade: false, acknowledgeSecurityRollback: false, json: false, dryRun: false, quiet: true, importMetaUrl });

    const manifestAfterFirst = JSON.parse(
      await fs.readFile(path.join(tmpDir, ".specforge", "manifest.json"), "utf8"),
    );

    await runMigrate({ cwd: tmpDir, apply: true, to: null, allowDowngrade: false, acknowledgeSecurityRollback: false, json: false, dryRun: false, quiet: true, importMetaUrl });

    const manifestAfterSecond = JSON.parse(
      await fs.readFile(path.join(tmpDir, ".specforge", "manifest.json"), "utf8"),
    );

    // Migrations applied count should be same (idempotent - not duplicated)
    expect(manifestAfterFirst.migrations_applied.length).toBe(manifestAfterSecond.migrations_applied.length);
  });
});

describe("migrate: downgrade without flag refuses", () => {
  it("migrate --to=<older> without --allow-downgrade exits 2 and does not mutate files", async () => {
    await setupManifest(tmpDir, "0.7.0");
    const importMetaUrl = synthBundleImportMetaUrl();

    const exitCode = await runMigrate({
      cwd: tmpDir,
      apply: true,
      to: "0.6.0",
      allowDowngrade: false,
      acknowledgeSecurityRollback: false,
      json: false,
      dryRun: false,
      quiet: true,
      importMetaUrl,
    });
    expect(exitCode).toBe(2);

    // Manifest should be unchanged
    const manifest = JSON.parse(
      await fs.readFile(path.join(tmpDir, ".specforge", "manifest.json"), "utf8"),
    );
    expect(manifest.framework_version).toBe("0.7.0");
  });
});

describe("migrate: downgrade with flag, all down() present", () => {
  it("migrate --to=<older> --allow-downgrade --apply runs each migration's down() in reverse; manifest reflects the older version", async () => {
    await setupManifest(tmpDir, "0.7.0");
    const importMetaUrl = synthBundleImportMetaUrl();

    const exitCode = await runMigrate({
      cwd: tmpDir,
      apply: true,
      to: "0.6.0",
      allowDowngrade: true,
      acknowledgeSecurityRollback: false,
      json: false,
      dryRun: false,
      quiet: true,
      importMetaUrl,
    });
    expect(exitCode).toBe(0);

    const manifest = JSON.parse(
      await fs.readFile(path.join(tmpDir, ".specforge", "manifest.json"), "utf8"),
    );
    expect(manifest.framework_version).toBe("0.6.0");
    // Should have a migration entry with direction "down"
    const downEntry = manifest.migrations_applied.find((e: any) => e.direction === "down");
    expect(downEntry).toBeDefined();
  });
});

describe("migrate: downgrade refuses when any down() missing", () => {
  it("If any migration in the reverse path lacks down(), exit 4 before any file mutation", async () => {
    // Fixture: 0.7.0 → 0.8.0 has no down(); 0.8.0 → 0.9.0 has both. Manifest
    // starts at 0.9.0. Downgrade to 0.7.0 must refuse with exit 4 because the
    // reverse path contains 0.7.0 → 0.8.0 lacking down(). Synthesize a bundle
    // at 0.9.0 so the "installed newer than bundled" guard does not fire.
    await setupManifest(tmpDir, "0.9.0");
    const importMetaUrl = await synthBundleAt(tmpDir, "0.9.0");

    const extraMigrations = [
      makeTestMigration({
        from: "0.7.0",
        to: "0.8.0",
        description: "fixture: 0.7.0 → 0.8.0 (no down)",
        up: async () => ({ description: "fixture up", changed_files: [] }),
        // No `down` — this is the offender.
      }),
      makeTestMigration({
        from: "0.8.0",
        to: "0.9.0",
        description: "fixture: 0.8.0 → 0.9.0",
        up: async () => ({ description: "fixture up", changed_files: [] }),
        down: async () => ({ description: "fixture down", changed_files: [] }),
      }),
    ];

    const errChunks: string[] = [];
    const origWrite = process.stderr.write.bind(process.stderr);
    (process.stderr as any).write = (chunk: any) => {
      errChunks.push(String(chunk));
      return true;
    };
    let exitCode: number;
    try {
      exitCode = await runMigrate({
        cwd: tmpDir,
        apply: true,
        to: "0.7.0",
        allowDowngrade: true,
        acknowledgeSecurityRollback: false,
        json: false,
        dryRun: false,
        quiet: true,
        importMetaUrl,
        extraMigrations,
      });
    } finally {
      (process.stderr as any).write = origWrite;
    }

    expect(exitCode).toBe(4);
    // Message must identify the offending migration (0.7.0 → 0.8.0).
    const combined = errChunks.join("");
    expect(combined).toContain("0.7.0");
    expect(combined).toContain("0.8.0");

    // Manifest must be untouched.
    const manifest = JSON.parse(
      await fs.readFile(path.join(tmpDir, ".specforge", "manifest.json"), "utf8"),
    );
    expect(manifest.framework_version).toBe("0.9.0");
    expect(manifest.migrations_applied).toEqual([]);
  });
});

describe("migrate: --to=<X> with no migration path", () => {
  it("migrate --to=99.0.0 (no path) exits 2 with the no-path error; filesystem unchanged", async () => {
    await setupManifest(tmpDir, "0.6.0");
    const importMetaUrl = synthBundleImportMetaUrl();

    const exitCode = await runMigrate({
      cwd: tmpDir,
      apply: true,
      to: "99.0.0",
      allowDowngrade: false,
      acknowledgeSecurityRollback: false,
      json: false,
      dryRun: false,
      quiet: true,
      importMetaUrl,
    });
    expect(exitCode).toBe(2);

    // Manifest unchanged
    const manifest = JSON.parse(
      await fs.readFile(path.join(tmpDir, ".specforge", "manifest.json"), "utf8"),
    );
    expect(manifest.framework_version).toBe("0.6.0");
  });
});

describe("migrate: security-sensitive rollback requires acknowledgement", () => {
  // Fixture: a security-sensitive 0.7.0 → 0.8.0 with both up and down.
  const SENSITIVE_DESCRIPTION = "fixture: sensitive rollback gate";
  function sensitiveFixture() {
    return [
      makeTestMigration({
        from: "0.7.0",
        to: "0.8.0",
        description: SENSITIVE_DESCRIPTION,
        security_sensitive: true,
        up: async () => ({ description: "fixture up", changed_files: [] }),
        down: async () => ({ description: "fixture down", changed_files: [] }),
      }),
    ];
  }

  it("sub-case A: without --acknowledge-security-rollback exits 4, lists the sensitive migration, leaves manifest unchanged", async () => {
    await setupManifest(tmpDir, "0.8.0");
    const importMetaUrl = await synthBundleAt(tmpDir, "0.8.0");

    const errChunks: string[] = [];
    const origWrite = process.stderr.write.bind(process.stderr);
    (process.stderr as any).write = (chunk: any) => {
      errChunks.push(String(chunk));
      return true;
    };
    let exitCode: number;
    try {
      exitCode = await runMigrate({
        cwd: tmpDir,
        apply: true,
        to: "0.7.0",
        allowDowngrade: true,
        acknowledgeSecurityRollback: false,
        json: false,
        dryRun: false,
        quiet: true,
        importMetaUrl,
        extraMigrations: sensitiveFixture(),
      });
    } finally {
      (process.stderr as any).write = origWrite;
    }

    expect(exitCode).toBe(4);
    const combined = errChunks.join("");
    expect(combined).toContain(SENSITIVE_DESCRIPTION);

    const manifest = JSON.parse(
      await fs.readFile(path.join(tmpDir, ".specforge", "manifest.json"), "utf8"),
    );
    expect(manifest.framework_version).toBe("0.8.0");
    expect(manifest.migrations_applied).toEqual([]);
  });

  it("sub-case B: with --acknowledge-security-rollback exits 0; manifest records direction=down, security_sensitive=true", async () => {
    await setupManifest(tmpDir, "0.8.0");
    const importMetaUrl = await synthBundleAt(tmpDir, "0.8.0");

    const exitCode = await runMigrate({
      cwd: tmpDir,
      apply: true,
      to: "0.7.0",
      allowDowngrade: true,
      acknowledgeSecurityRollback: true,
      json: false,
      dryRun: false,
      quiet: true,
      importMetaUrl,
      extraMigrations: sensitiveFixture(),
    });
    expect(exitCode).toBe(0);

    const manifest = JSON.parse(
      await fs.readFile(path.join(tmpDir, ".specforge", "manifest.json"), "utf8"),
    );
    expect(manifest.framework_version).toBe("0.7.0");
    const downEntry = manifest.migrations_applied.find(
      (e: any) => e.direction === "down",
    );
    expect(downEntry).toBeDefined();
    expect(downEntry.direction).toBe("down");
    expect(downEntry.security_sensitive).toBe(true);
  });
});

describe("migrate: applied-once tracked", () => {
  it("Running migrate --apply against a manifest already listing the migration in migrations_applied skips with a log line; manifest is not duplicated", async () => {
    await setupManifest(tmpDir, "0.6.0");
    const importMetaUrl = synthBundleImportMetaUrl();

    // First apply
    await runMigrate({ cwd: tmpDir, apply: true, to: null, allowDowngrade: false, acknowledgeSecurityRollback: false, json: false, dryRun: false, quiet: true, importMetaUrl });

    const manifestAfterFirst = JSON.parse(
      await fs.readFile(path.join(tmpDir, ".specforge", "manifest.json"), "utf8"),
    );
    const countAfterFirst = manifestAfterFirst.migrations_applied.length;

    // Second apply — should skip, not duplicate
    await runMigrate({ cwd: tmpDir, apply: true, to: null, allowDowngrade: false, acknowledgeSecurityRollback: false, json: false, dryRun: false, quiet: true, importMetaUrl });

    const manifestAfterSecond = JSON.parse(
      await fs.readFile(path.join(tmpDir, ".specforge", "manifest.json"), "utf8"),
    );
    expect(manifestAfterSecond.migrations_applied.length).toBe(countAfterFirst);
  });
});
