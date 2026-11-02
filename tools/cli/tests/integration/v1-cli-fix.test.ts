// Fix round of specforge/changes/2026-11-02-v1-out-of-the-cli (review BLOCK):
// scenario 10. The install probe refuses on any lstat error other than not-found.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { mkTmpDir } from "../helpers.js";
import { runInit } from "../../src/commands/init.js";

let tmp: string;
beforeEach(async () => { tmp = await mkTmpDir(); });
afterEach(async () => { await fs.rm(tmp, { recursive: true, force: true }); });

async function bundle(): Promise<string> {
  const pkg = path.join(tmp, "pkg");
  for (const [rel, text] of Object.entries({ VERSION: "1.0.0\n", "CLAUDE.md": "# c\n", "templates/contract.md": "# t\n" })) {
    await fs.mkdir(path.dirname(path.join(pkg, "framework", rel)), { recursive: true });
    await fs.writeFile(path.join(pkg, "framework", rel), text);
  }
  return pathToFileURL(path.join(pkg, "dist", "cli.js")).href;
}

describe("v1-out-of-the-cli fix round", () => {
  it("10 a file where the bundle needs a directory stops init before any write", async () => {
    const url = await bundle();
    const repo = path.join(tmp, "repo");
    await fs.mkdir(repo);
    await fs.writeFile(path.join(repo, "templates"), "mine\n");
    const chunks: string[] = [];
    const err = process.stderr.write.bind(process.stderr);
    process.stderr.write = ((c: string | Uint8Array) => { chunks.push(String(c)); return true; }) as typeof process.stderr.write;
    let code: number;
    try {
      code = await runInit({ cwd: repo, force: false, erase: false, noGitSafety: true, dryRun: false, quiet: true, importMetaUrl: url });
    } finally {
      process.stderr.write = err;
    }
    // Fails against a probe that treats every lstat error (here ENOTDIR) as absent: init writes CLAUDE.md, then exits 10.
    expect(code, chunks.join("")).toBe(2);
    expect(await fs.readFile(path.join(repo, "templates"), "utf8")).toBe("mine\n");
    expect(await fs.readdir(repo)).toEqual(["templates"]);
  });
});
