// Fix round of specforge/changes/2026-10-29-update-retire-hardening (review BLOCK):
// scenarios 10-11. A socket at a retired path is kept without being opened, and a
// bundle path whose identity cannot be read stops the run before any write.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as net from "node:net";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { mkTmpDir } from "../helpers.js";
import { runInit } from "../../src/commands/init.js";
import { runUpdate } from "../../src/commands/update.js";
import { sha256OfFile } from "../../src/sha.js";

let tmp: string;
let repo: string;
let n = 0;
const servers: net.Server[] = [];

beforeEach(async () => {
  tmp = await mkTmpDir();
  repo = path.join(tmp, "r");
  await fs.mkdir(repo);
});

afterEach(async () => {
  for (const s of servers.splice(0)) await new Promise<void>((res) => s.close(() => res()));
  await fs.rm(tmp, { recursive: true, force: true });
});

async function bundle(version: string, files: Record<string, string>): Promise<string> {
  const pkg = path.join(tmp, `p${n++}`);
  await fs.mkdir(path.join(pkg, "dist"), { recursive: true });
  for (const [rel, text] of Object.entries({ VERSION: `${version}\n`, ...files })) {
    const abs = path.join(pkg, "framework", rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, text);
  }
  return pathToFileURL(path.join(pkg, "dist", "cli.js")).href;
}

async function install(files: Record<string, string>): Promise<void> {
  const url = await bundle("0.30.0", files);
  expect(await runInit({ cwd: repo, force: false, erase: false, noGitSafety: true, dryRun: false, quiet: true, importMetaUrl: url })).toBe(0);
}

async function update(files: Record<string, string>, retired: string[], dryRun = false) {
  const url = await bundle("1.0.0", files);
  const chunks: string[] = [];
  const out = process.stdout.write.bind(process.stdout);
  const err = process.stderr.write.bind(process.stderr);
  const grab = ((c: string | Uint8Array) => { chunks.push(String(c)); return true; }) as typeof process.stdout.write;
  process.stdout.write = grab;
  process.stderr.write = grab;
  try {
    const code = await runUpdate({ cwd: repo, strategy: null, dryRun, quiet: false, importMetaUrl: url, retired });
    return { code, out: chunks.join("") };
  } finally {
    process.stdout.write = out;
    process.stderr.write = err;
  }
}

const at = (rel: string) => path.join(repo, rel);
const manifest = () => fs.readFile(at(".specforge/manifest.json"), "utf8");

describe("update-retire-hardening fix round", () => {
  it("10 a socket at a retired path is kept and never opened", async () => {
    // A short retired path: a Unix socket path must stay under 104 bytes on macOS.
    await install({ "CLAUDE.md": "v1\n" });
    const m = JSON.parse(await manifest());
    await fs.writeFile(at("s.md"), "s\n");
    m.framework_files.push({ path: "s.md", sha256_at_install: await sha256OfFile(at("s.md")) });
    await fs.writeFile(at(".specforge/manifest.json"), JSON.stringify(m, null, 2) + "\n");
    await fs.rm(at("s.md"));
    const srv = net.createServer();
    await new Promise<void>((res, rej) => { srv.once("error", rej); srv.listen(at("s.md"), () => res()); });
    servers.push(srv);
    for (const dryRun of [true, false]) {
      const r = await update({ "CLAUDE.md": "v1\n" }, ["s.md"], dryRun);
      // Fails against opening it before branching on lstat's type: the open fails, and the run exits 10.
      expect(r.code, `dryRun=${dryRun}: ${r.out}`).toBe(0);
      expect(r.out).toMatch(/kept {4}s\.md \(not a regular file; not read\)/);
      expect(r.out).not.toMatch(/error {3}s\.md/);
    }
    expect((await fs.lstat(at("s.md"))).isSocket()).toBe(true);
  });

  it("11 a bundle path whose identity cannot be read stops a real run before any write", async () => {
    await install({ "CLAUDE.md": "v1\n", "templates/a.md": "A\n", "templates/old.md": "O\n" });
    await fs.rm(at("templates/a.md"));
    await fs.symlink("a.md", at("templates/a.md")); // a self-loop: stat gives ELOOP
    const before = await manifest();
    const r = await update({ "CLAUDE.md": "v2\n", "templates/a.md": "A\n" }, ["templates/old.md"]);
    // Fails against swallowing every stat error in the identity map, which carries on and writes.
    expect(r.code, r.out).toBe(10);
    expect(r.out).toContain("templates/a.md");
    expect(await fs.readFile(at("CLAUDE.md"), "utf8")).toBe("v1\n");
    expect(await manifest()).toBe(before);
    expect(await fs.readFile(at("templates/old.md"), "utf8")).toBe("O\n");
  });
});
