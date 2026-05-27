// Row #55: migrate: idempotency at script level
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { mkTmpDir } from "../../helpers.js";
import * as migration from "../../../migrations/0.6.0-to-0.7.0.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkTmpDir();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("migrate: idempotency at script level", () => {
  it("The bundled 0.6.0-to-0.7.0 migration up() called twice produces the same result as one call", async () => {
    const report1 = await migration.up(tmpDir);
    const report2 = await migration.up(tmpDir);
    expect(report1.changed_files).toEqual(report2.changed_files);
    expect(report2.changed_files).toHaveLength(0);
  });

  it("The bundled 0.6.0-to-0.7.0 migration down() called twice produces the same result as one call", async () => {
    const report1 = await migration.down(tmpDir);
    const report2 = await migration.down(tmpDir);
    expect(report1.changed_files).toEqual(report2.changed_files);
    expect(report2.changed_files).toHaveLength(0);
  });

  it("exports correct from and to versions", () => {
    expect(migration.from).toBe("0.6.0");
    expect(migration.to).toBe("0.7.0");
  });

  it("exports a description string", () => {
    expect(typeof migration.description).toBe("string");
    expect(migration.description.length).toBeGreaterThan(0);
  });

  it("exports security_sensitive as false", () => {
    expect(migration.security_sensitive).toBe(false);
  });
});
