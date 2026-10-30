// Fix round of specforge/changes/2026-10-29-update-removes-retired (review
// should-fix): scenarios 7-9. A symlink at a retired path is never followed,
// only a missing file counts as already gone, and the dry run reports counts.
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

describe("update-removes-retired fix round", () => {
  for (const kind of ["dangling", "other bytes", "install bytes"] as const) {
    it(`7 a symlink at a retired path (${kind}) is kept, reported and never followed`, async () => {
      await install();
      const target = path.join(tmp, "target.md");
      if (kind !== "dangling") await fs.writeFile(target, kind === "other bytes" ? "other\n" : "old rule\n");
      await fs.rm(path.join(repo, OLD));
      await fs.symlink(target, path.join(repo, OLD));
      for (const dryRun of [true, false]) {
        const r = await update(dryRun);
        // Fails against hashing through the link: a dangling link vanished from tracking silently,
        // other bytes read as "edited", and install bytes made the real run exit 10.
        expect(r.code, `dryRun=${dryRun}`).toBe(0);
        expect(r.out).toMatch(/kept {4}\.claude\/rules\/old\.md \(symlink; not followed\)/);
        expect(r.out).not.toMatch(/remove {2}\.claude\/rules\/old\.md/);
        expect((await fs.lstat(path.join(repo, OLD))).isSymbolicLink()).toBe(true);
      }
      expect(JSON.parse(await manifest()).framework_files.map((f: { path: string }) => f.path)).not.toContain(OLD);
      if (kind !== "dangling") expect(await fs.readFile(target, "utf8")).toBe(kind === "other bytes" ? "other\n" : "old rule\n");
    });
  }

  for (const kind of ["a directory", "an unreadable file"] as const) {
    it(`8 ${kind} at a retired path exits 10 and leaves the manifest unchanged`, async () => {
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
      const r = await update();
      // Fails against `.catch(() => null)`, which read every error as "already gone" and exited 0.
      expect(r.code).toBe(10);
      expect(await manifest()).toBe(before);
    });
  }

  it("9 the dry-run summary carries the retired counts", async () => {
    await install();
    const r = await update(true);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/^dry-run: .*1 retired removed, 0 retired kept$/m);
  });
});
