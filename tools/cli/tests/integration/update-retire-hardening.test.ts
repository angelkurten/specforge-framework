// `update`'s retired-file removal is safe to fail and to restart. Scenarios 1-9 of
// specforge/changes/2026-10-29-update-retire-hardening/contract.md, numbered the
// same way. Each test installs bundle A with `init`, then runs `update` against a
// bundle B, passing the retired globs it declares.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { constants, promises as fs } from "node:fs";
import { execFileSync } from "node:child_process";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { mkTmpDir } from "../helpers.js";
import { runInit } from "../../src/commands/init.js";
import { runUpdate } from "../../src/commands/update.js";
import { sha256OfFile } from "../../src/sha.js";

let tmp: string;
let repo: string;
let n = 0;
const fifos: string[] = [];
const unwritable: string[] = [];

beforeEach(async () => {
  tmp = await mkTmpDir();
  repo = path.join(tmp, "repo");
  await fs.mkdir(repo);
});

afterEach(async () => {
  // A reader left blocked on a FIFO (the broken implementations) would hold a libuv
  // thread forever; opening the write end releases it with an empty read.
  for (const f of fifos.splice(0)) {
    const h = await fs.open(f, constants.O_WRONLY | constants.O_NONBLOCK).catch(() => null);
    await h?.close();
  }
  for (const d of unwritable.splice(0)) await fs.chmod(d, 0o755).catch(() => undefined);
  await fs.rm(tmp, { recursive: true, force: true });
});

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

async function install(files: Record<string, string>): Promise<void> {
  const url = await bundle("0.30.0", files);
  expect(await runInit({ cwd: repo, force: false, erase: false, noGitSafety: true, dryRun: false, quiet: true, importMetaUrl: url })).toBe(0);
}

type Opts = { strategy?: "ours" | "theirs" | null; dryRun?: boolean; quiet?: boolean };

async function update(files: Record<string, string>, retired: string[], opts: Opts = {}) {
  const url = await bundle("1.0.0", files);
  const chunks: string[] = [];
  const out = process.stdout.write.bind(process.stdout);
  const err = process.stderr.write.bind(process.stderr);
  const grab = ((c: string | Uint8Array) => { chunks.push(String(c)); return true; }) as typeof process.stdout.write;
  process.stdout.write = grab;
  process.stderr.write = grab;
  try {
    const code = await runUpdate({
      cwd: repo, strategy: opts.strategy ?? null, dryRun: opts.dryRun ?? false, quiet: opts.quiet ?? false,
      importMetaUrl: url, retired,
    });
    return { code, out: chunks.join("") };
  } finally {
    process.stdout.write = out;
    process.stderr.write = err;
  }
}

const at = (rel: string) => path.join(repo, rel);
const manifest = () => fs.readFile(at(".specforge/manifest.json"), "utf8");
const tracked = async () => (JSON.parse(await manifest()).framework_files as { path: string }[]).map((f) => f.path);
const exists = (abs: string) => fs.lstat(abs).then(() => true, () => false);
const read = (abs: string) => fs.readFile(abs, "utf8");

function mkfifo(abs: string): void {
  execFileSync("mkfifo", [abs]);
  fifos.push(abs);
}

async function plantManifestEntry(rel: string, sha: string): Promise<void> {
  const m = JSON.parse(await manifest());
  m.framework_files.push({ path: rel, sha256_at_install: sha });
  await fs.writeFile(at(".specforge/manifest.json"), JSON.stringify(m, null, 2) + "\n");
}

const OLD = ".claude/rules/old.md";

describe("update-retire-hardening", () => {
  it("1 a read error stops the run before any write, and the next run starts clean", async () => {
    await install({ "CLAUDE.md": "v1\n", [OLD]: "old\n" });
    await fs.rm(at(OLD));
    await fs.mkdir(at(OLD));
    await fs.writeFile(path.join(at(OLD), "inside.md"), "x\n");
    const before = await manifest();
    const r = await update({ "CLAUDE.md": "v2\n" }, [OLD]);
    expect(r.code).toBe(10);
    expect(r.out).toContain(OLD);
    // Fails against classifying after the refresh: CLAUDE.md was rewritten, and the restart halted on drift.
    expect(await read(at("CLAUDE.md"))).toBe("v1\n");
    expect(await manifest()).toBe(before);
    await fs.rm(at(OLD), { recursive: true });
    await fs.writeFile(at(OLD), "old\n");
    const again = await update({ "CLAUDE.md": "v2\n" }, [OLD]);
    expect(again.code, again.out).toBe(0);
    expect(await read(at("CLAUDE.md"))).toBe("v2\n");
    expect(await exists(at(OLD))).toBe(false);
  });

  it("2 a retired hard link to a bundle path is kept, decided before the refresh rewrites it", async () => {
    await install({ "templates/a.md": "A\n", [OLD]: "A\n" });
    await fs.rm(at(OLD));
    await fs.link(at("templates/a.md"), at(OLD));
    const B = { "templates/a.md": "A2\n" };
    const dry = await update(B, [OLD], { dryRun: true, strategy: "theirs" });
    expect(dry.out).toMatch(/kept {4}\.claude\/rules\/old\.md \(same file as templates\/a\.md\)/);
    expect(dry.out).not.toMatch(/remove {2}\.claude\/rules\/old\.md/);
    const r = await update(B, [OLD], { strategy: "theirs" });
    expect(r.code, r.out).toBe(0);
    expect(r.out).toMatch(/kept {4}\.claude\/rules\/old\.md \(same file as templates\/a\.md\)/);
    // Fails against an identity check after the refresh, or none: the retired name is removed.
    expect(await exists(at(OLD))).toBe(true);
    expect(await read(at("templates/a.md"))).toBe("A2\n");
  });

  it("3 a case-only alias of a bundle path is kept under --strategy=theirs", async () => {
    const probe = path.join(tmp, "CaseProbe");
    await fs.writeFile(probe, "");
    if (!(await exists(path.join(tmp, "caseprobe")))) {
      console.warn("DEVIATION: case-sensitive filesystem; scenario 3 did not run");
      return;
    }
    await install({ "examples/Foo.md": "X\n" });
    const r = await update({ "examples/foo.md": "X\n" }, ["examples/**"], { strategy: "theirs" });
    expect(r.code, r.out).toBe(0);
    expect(r.out).toMatch(/kept {4}examples\/Foo\.md \(same file as examples\/foo\.md\)/);
    // Fails against classify-first without dev+ino: unlinking the untouched Foo.md deletes foo.md.
    expect(await read(at("examples/foo.md"))).toBe("X\n");
  });

  it("4 a retired file under a symlinked parent is kept, inside or outside the repository", async () => {
    await install({ "examples/old.md": "O\n" });
    for (const target of [at("real"), path.join(tmp, "outside")]) {
      await fs.rm(at("examples"), { recursive: true, force: true });
      await fs.mkdir(target, { recursive: true });
      await fs.writeFile(path.join(target, "old.md"), "O\n");
      await fs.symlink(target, at("examples"));
      for (const dryRun of [true, false]) {
        const r = await update({}, ["examples/**"], { dryRun });
        // Fails against today's safeUnlink (unlinks through an inside link, exits 10 on an outside one),
        // and against an lstat-or-read-before-walk order, which prints another reason.
        expect(r.code, `${target} dryRun=${dryRun}: ${r.out}`).toBe(0);
        expect(r.out).toMatch(/kept {4}examples\/old\.md \(symlink in path; not followed\)/);
        expect(await read(path.join(target, "old.md"))).toBe("O\n");
      }
      // Re-plant the entry the real run dropped, for the second target.
      await plantManifestEntry("examples/old.md", await sha256OfFile(path.join(target, "old.md")));
    }
  });

  it("5 a manifest path that leaves the repository is never read", { timeout: 10000 }, async () => {
    await install({ "CLAUDE.md": "v1\n" });
    mkfifo(path.join(tmp, "outside.md"));
    await plantManifestEntry("examples/../../outside.md", "0".repeat(64));
    const r = await update({ "CLAUDE.md": "v1\n" }, ["examples/**"]);
    // Fails against hashing it: the FIFO blocks the read until the timeout.
    expect(r.code, r.out).toBe(0);
    expect(r.out).toMatch(/kept {4}examples\/\.\.\/\.\.\/outside\.md \(outside the repository; not read\)/);
  });

  it("6 a FIFO at a retired path is kept and never read", { timeout: 10000 }, async () => {
    await install({ [OLD]: "old\n" });
    await fs.rm(at(OLD));
    mkfifo(at(OLD));
    const r = await update({}, [OLD]);
    // Fails against hashing it, which blocks forever.
    expect(r.code, r.out).toBe(0);
    expect(r.out).toMatch(/kept {4}\.claude\/rules\/old\.md \(not a regular file; not read\)/);
  });

  it("7 an unlink that fails is not fatal", async () => {
    if (process.getuid?.() === 0) {
      console.warn("DEVIATION: running as uid 0; a mode-0555 directory does not refuse unlink, scenario 7 did not run");
      return;
    }
    await install({ [OLD]: "old\n" });
    await fs.chmod(at(".claude/rules"), 0o555);
    unwritable.push(at(".claude/rules"));
    const r = await update({}, [OLD]);
    // Fails against letting the unlink error reach the exit-10 path after the refresh.
    expect(r.code, r.out).toBe(0);
    expect(r.out).toMatch(/kept {4}\.claude\/rules\/old\.md \(EACCES\)/);
    expect(await tracked()).not.toContain(OLD);
  });

  it("8 kept lines survive --quiet in the dry run and the real run; remove lines do not", async () => {
    await install({ [OLD]: "old\n", "templates/legacy/prd.md": "# PRD\n" });
    await fs.writeFile(at(OLD), "old, edited\n");
    for (const dryRun of [true, false]) {
      const r = await update({}, [OLD, "templates/legacy/**"], { dryRun, quiet: true });
      // Fails against printing kept lines through info, which --quiet silences.
      expect(r.out, `dryRun=${dryRun}`).toMatch(/kept {4}\.claude\/rules\/old\.md \(edited;/);
      expect(r.out, `dryRun=${dryRun}`).not.toMatch(/remove {2}templates\/legacy\/prd\.md/);
    }
  });

  it("9 control, backslash and bidi characters in a printed path are escaped", async () => {
    const name = ".claude/rules/a\x1bb\\c\u202Ed.md";
    await install({ [name]: "n\n" });
    const r = await update({}, [".claude/rules/*.md"]);
    expect(r.code, r.out).toBe(0);
    // Fails against printing the path raw.
    expect(r.out).toContain("a\\x1bb\\x5cc\\u{202E}d.md");
    expect(r.out).not.toContain("\x1b");
    expect(r.out).not.toContain("\u202E");
  });
});
