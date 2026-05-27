// Test helpers for @angelkurten/specforge CLI tests.
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

import { acquireLock, type LockHandle } from "../src/lock.js";

/**
 * Create a temporary directory and return its path.
 * The caller is responsible for cleanup.
 */
export async function mkTmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "specforge-test-"));
}

/**
 * Run a callback with a fresh temp directory, then clean up.
 */
export async function withTmpDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkTmpDir();
  try {
    return await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

/**
 * Acquire a lock, run callback, then release. Ensures the lock is
 * always cleaned up (avoids leaking SIGINT/SIGTERM handlers).
 */
export async function withLock<T>(
  cwd: string,
  command: "init" | "update" | "migrate",
  fn: (handle: LockHandle) => Promise<T>,
): Promise<T> {
  const handle = await acquireLock(cwd, command);
  try {
    return await fn(handle);
  } finally {
    await handle.release();
  }
}

/**
 * Returns an import.meta.url-shaped string that, when passed to
 * bundleRoot(), resolves to `<fakePkgDir>/framework`.
 *
 * The fake-pkg layout is:
 *   tests/fixtures/fake-pkg/
 *     dist/cli.js   (virtual — the file doesn't need to exist)
 *     framework/    (actual synth-bundle content)
 */
export function synthBundleImportMetaUrl(): string {
  const fakePkgDir = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    "fixtures",
    "fake-pkg",
  );
  // bundleRoot resolves: path.dirname(fileURLToPath(url)) -> "../framework"
  // so url must point at <fakePkgDir>/dist/something.js
  const fakeCli = path.join(fakePkgDir, "dist", "cli.js");
  return pathToFileURL(fakeCli).href;
}

/**
 * Write a minimal valid manifest to a tmpdir.
 */
export async function writeMinimalManifest(
  cwd: string,
  overrides: Record<string, unknown> = {},
): Promise<void> {
  const manifest = {
    schema_version: "1",
    framework_version: "0.7.0",
    installed_at: new Date().toISOString(),
    last_updated_at: new Date().toISOString(),
    last_doctor_at: null,
    framework_files: [],
    migrations_applied: [],
    ...overrides,
  };
  const dir = path.join(cwd, ".specforge");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
}
