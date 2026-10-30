// Fix round 2 of specforge/changes/2026-10-29-update-retire-hardening (re-verification
// should-fix): scenario 12, the dry-run half of scenario 11.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { mkTmpDir } from "../helpers.js";
import { runInit } from "../../src/commands/init.js";
import { runUpdate } from "../../src/commands/update.js";

let tmp: string;
let repo: string;
let n = 0;

beforeEach(async () => {
  tmp = await mkTmpDir();
  repo = path.join(tmp, "r");
  await fs.mkdir(repo);
});

afterEach(async () => {
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

describe("update-retire-hardening fix round 2", () => {
  it("12 a dry run with an unreadable bundle identity reports it, keeps the usual summary and writes nothing", async () => {
    await install({ "CLAUDE.md": "v1\n", "templates/a.md": "A\n", "templates/old.md": "O\n" });
    await fs.rm(at("templates/a.md"));
    await fs.symlink("a.md", at("templates/a.md")); // a self-loop: stat gives ELOOP
    const before = await manifest();
    const r = await update({ "CLAUDE.md": "v2\n", "templates/a.md": "A\n" }, ["templates/old.md"], true);
    // Fails against a dry run that exits non-zero, prints no error line, or drops the usual summary line.
    expect(r.code, r.out).toBe(0);
    expect(r.out).toMatch(/^ {2}error {3}templates\/a\.md \(ELOOP\)$/m);
    expect(r.out).toMatch(/^dry-run: \d+ updates, \d+ drifted \(strategy: [a-z]+\)/m);
    expect(await fs.readFile(at("CLAUDE.md"), "utf8")).toBe("v1\n");
    expect(await manifest()).toBe(before);
  });
});
