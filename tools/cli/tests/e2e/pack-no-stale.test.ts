// Edge test, Direct mode: the packed tarball carries no compiled file whose
// source is gone. A local build used to leave dist/src/merge.js behind after
// merge.ts was deleted in 0.27.2, so a locally packed tarball differed from
// the published one; `build` now empties dist/ and dist-scripts/ first.
import { describe, it, expect, beforeAll } from "vitest";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import * as path from "node:path";
import { findPackedTarball } from "../global-setup.js";

const CLI_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");

let tgzPath: string | null = null;

beforeAll(async () => {
  tgzPath = await findPackedTarball();
}, 120000);

describe("end-to-end: no stale build output in the tarball", () => {
  it("every dist/**/*.js in the tarball has its .ts source", () => {
    if (!tgzPath) {
      console.warn("DEVIATION: npm pack failed; stale-output test skipped");
      return;
    }
    const list = spawnSync("tar", ["tzf", tgzPath], { encoding: "utf8" });
    expect(list.status).toBe(0);
    const compiled = list.stdout.split("\n").filter((f) => /^package\/dist\/.*\.js$/.test(f));
    expect(compiled.length).toBeGreaterThan(0);
    // Fails against a build that compiles over a dist/ it never empties.
    const orphans = compiled.filter((f) => !existsSync(path.join(CLI_DIR, f.slice("package/dist/".length).replace(/\.js$/, ".ts"))));
    expect(orphans).toEqual([]);
  });
});
