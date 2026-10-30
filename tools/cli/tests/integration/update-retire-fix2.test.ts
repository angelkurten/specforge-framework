// Fix round 2 of specforge/changes/2026-10-29-update-removes-retired (review
// should-fix): scenario 10. The dry run reports a retired path it cannot read
// instead of hiding it, and still exits 0.
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
  repo = path.join(tmp, "repo");
  await fs.mkdir(repo);
});

afterEach(async () => {
  await fs.chmod(path.join(repo, ".claude/rules/old.md"), 0o755).catch(() => undefined);
  await fs.rm(tmp, { recursive: true, force: true });
});

const A = { "CLAUDE.md": "# fixture\n", ".claude/rules/old.md": "old rule\n", ".claude/rules/keep.md": "kept rule\n" };
const B = { "CLAUDE.md": "# fixture\n", ".claude/rules/keep.md": "kept rule\n" };
const RETIRED = [".claude/rules/old.md"];
const OLD = ".claude/rules/old.md";

async function bundle(version: string, files: Record<string, string>): Promise<string> {
  const pkg = path.join(tmp, `pkg${n++}`);
  await fs.mkdir(path.join(pkg, "dist"), { recursive: true });
  for (const [rel, text] of Object.entries({ VERSION: `${version}\n`, ...files })) {
    const abs = path.join(pkg, "framework", rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, text);
  }
  return pathToFileURL(path.join(pkg, "dist", "cli.js")).href;
}

async function install(): Promise<void> {
  const url = await bundle("0.30.0", A);
  expect(await runInit({ cwd: repo, force: false, erase: false, noGitSafety: true, dryRun: false, quiet: true, importMetaUrl: url })).toBe(0);
}

async function update(dryRun = false) {
  const url = await bundle("1.0.0", B);
  const chunks: string[] = [];
  const orig = process.stdout.write.bind(process.stdout);
  const origErr = process.stderr.write.bind(process.stderr);
  process.stdout.write = ((c: string | Uint8Array) => { chunks.push(String(c)); return true; }) as typeof process.stdout.write;
  process.stderr.write = ((c: string | Uint8Array) => { chunks.push(String(c)); return true; }) as typeof process.stderr.write;
  try {
    const code = await runUpdate({ cwd: repo, strategy: null, dryRun, quiet: false, importMetaUrl: url, retired: RETIRED });
    return { code, out: chunks.join("") };
  } finally {
    process.stdout.write = orig;
    process.stderr.write = origErr;
  }
}

const manifest = () => fs.readFile(path.join(repo, ".specforge", "manifest.json"), "utf8");

describe("update-removes-retired fix round 2", () => {
  for (const [kind, code] of [["a directory", "EISDIR"], ["an unreadable file", "EACCES"]] as const) {
    it(`10 a dry run with ${kind} at a retired path prints an error line and exits 0`, async () => {
      await install();
      const abs = path.join(repo, OLD);
      if (kind === "a directory") {
        await fs.rm(abs);
        await fs.mkdir(abs);
        await fs.writeFile(path.join(abs, "inside.md"), "x\n");
      } else {
        await fs.chmod(abs, 0o000);
      }
      const before = await manifest();
      const r = await update(true);
      expect(r.code).toBe(0);
      // Fails against `.catch(() => null)` in the dry run, which printed nothing for the path.
      expect(r.out).toMatch(new RegExp(`^  error {3}\\.claude/rules/old\\.md \\(${code}\\)$`, "m"));
      expect(await manifest()).toBe(before);
      expect(await fs.lstat(abs).then(() => true, () => false)).toBe(true);
    });
  }
});
