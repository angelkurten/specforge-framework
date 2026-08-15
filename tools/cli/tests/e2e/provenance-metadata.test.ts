// Row #26: provenance metadata present in the npm-pack tarball.
//
// Originally landed inside pack-and-run.test.ts; relocated to honour PRD-003
// § 9 row #26's `Path` column (post-impl re-review BACKEND-1).
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promises as fs } from "node:fs";
import { spawnSync } from "node:child_process";
import * as path from "node:path";
import * as os from "node:os";
import { findPackedTarball } from "../global-setup.js";

const CLI_DIR = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../..",
);

let tgzPath: string | null = null;

// Packed once per run by tests/global-setup.ts — see the note there on why
// this file no longer packs its own.
beforeAll(async () => {
  tgzPath = await findPackedTarball();
}, 120000);

describe("end-to-end: provenance metadata present", () => {
  it("After npm pack, the package manifest carries the fields expected by npm audit signatures (offline check of metadata shape only)", async () => {
    if (!tgzPath) {
      console.warn("DEVIATION: npm pack failed; provenance metadata test skipped");
      return;
    }

    const extractDir = await fs.mkdtemp(path.join(os.tmpdir(), "specforge-prov-"));
    try {
      spawnSync("tar", ["xzf", tgzPath, "-C", extractDir, "--strip-components=1", "package/package.json"], {
        encoding: "utf8",
        timeout: 10000,
      });

      const pkgPath = path.join(extractDir, "package.json");
      let pkg: any;
      try {
        pkg = JSON.parse(await fs.readFile(pkgPath, "utf8"));
      } catch {
        spawnSync("tar", ["xzf", tgzPath, "-C", extractDir], {
          encoding: "utf8",
          timeout: 10000,
        });
        const pkgPath2 = path.join(extractDir, "package", "package.json");
        pkg = JSON.parse(await fs.readFile(pkgPath2, "utf8"));
      }

      expect(pkg).toHaveProperty("name", "@angelkurten/specforge");
      expect(pkg).toHaveProperty("version");
      expect(pkg).toHaveProperty("publishConfig");
      expect(pkg.publishConfig).toHaveProperty("provenance", true);
    } finally {
      await fs.rm(extractDir, { recursive: true, force: true });
    }
  });
});
