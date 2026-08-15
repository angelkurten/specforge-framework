// Pack the tarball exactly once for the whole run.
//
// Two e2e files assert against the packed artifact. Each used to run its own
// `npm pack`, which vitest schedules in parallel — and `prepack` refreshes the
// shared build artifacts (`dist/`, and `framework/` via a recursive rm), so two
// concurrent packs raced on the same tree and produced intermittently partial
// tarballs. Packing once here removes the race and the duplicated build.
import { promises as fs } from "node:fs";
import { spawnSync } from "node:child_process";
import * as path from "node:path";

const CLI_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

/** Fixed, gitignored location so the e2e files can find the tarball without
 *  env plumbing between the setup context and the test workers. */
export const TGZ_DIR = path.join(CLI_DIR, ".e2e-pack");

export async function setup(): Promise<void> {
  await fs.rm(TGZ_DIR, { recursive: true, force: true });
  await fs.mkdir(TGZ_DIR, { recursive: true });

  const r = spawnSync("npm", ["pack", "--pack-destination", TGZ_DIR], {
    cwd: CLI_DIR,
    encoding: "utf8",
    timeout: 180000,
  });

  // A failed pack is not fatal here: each e2e file already degrades to a
  // documented skip when no tarball is present, and a machine without a
  // working `npm pack` should not fail the other 390 tests.
  if (r.status !== 0) {
    console.error("global-setup: npm pack failed:", r.stderr);
  }
}

export async function teardown(): Promise<void> {
  await fs.rm(TGZ_DIR, { recursive: true, force: true });
}

/** The tarball `setup()` produced, or null when packing failed. Both e2e files
 *  already treat null as a documented skip rather than a failure. */
export async function findPackedTarball(): Promise<string | null> {
  let entries: string[];
  try {
    entries = await fs.readdir(TGZ_DIR);
  } catch {
    return null;
  }
  const tgz = entries.find((f) => f.endsWith(".tgz"));
  return tgz ? path.join(TGZ_DIR, tgz) : null;
}
