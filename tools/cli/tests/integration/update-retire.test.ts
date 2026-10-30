// `update` removes framework files a newer bundle retired. Scenarios 1-5 of
// specforge/changes/2026-10-29-update-removes-retired/contract.md, numbered the
// same way. Each test installs bundle A with `init`, then runs `update` against
// a bundle B that drops some of A's files, passing the retired globs it declares.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { mkTmpDir } from "../helpers.js";
import { runInit } from "../../src/commands/init.js";
import { runUpdate } from "../../src/commands/update.js";
import { sha256OfFile } from "../../src/sha.js";

let tmp: string;
let repo: string;

beforeEach(async () => {
  tmp = await mkTmpDir();
  repo = path.join(tmp, "repo");
  await fs.mkdir(repo);
});

afterEach(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
});

const A = {
  "CLAUDE.md": "# fixture\n",
  ".claude/rules/old.md": "old rule\n",
  ".claude/rules/keep.md": "kept rule\n",
  "templates/legacy/prd.md": "# PRD\n",
  "templates/contract.md": "# Contract\n",
};

/** A bundle at <tmp>/<name>/framework with VERSION and `files`; returns its importMetaUrl. */
async function bundle(name: string, version: string, files: Record<string, string>): Promise<string> {
  const pkg = path.join(tmp, name);
  await fs.mkdir(path.join(pkg, "dist"), { recursive: true });
  await fs.mkdir(path.join(pkg, "framework"), { recursive: true });
  await fs.writeFile(path.join(pkg, "framework", "VERSION"), `${version}\n`);
  for (const [rel, text] of Object.entries(files)) {
    const abs = path.join(pkg, "framework", rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, text);
  }
  return pathToFileURL(path.join(pkg, "dist", "cli.js")).href;
}

async function install(files: Record<string, string> = A): Promise<void> {
  const url = await bundle("a", "0.30.0", files);
  const code = await runInit({ cwd: repo, force: false, erase: false, noGitSafety: true, dryRun: false, quiet: true, importMetaUrl: url });
  expect(code).toBe(0);
}

const RETIRED = [".claude/rules/old.md", "templates/legacy/**"];

async function update(
  files: Record<string, string>,
  opts: { strategy?: "ours" | "theirs" | null; dryRun?: boolean; retired?: string[] } = {},
) {
  const url = await bundle(`b${Math.random().toString(36).slice(2)}`, "1.0.0", files);
  const chunks: string[] = [];
  const orig = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((c: string | Uint8Array) => { chunks.push(String(c)); return true; }) as typeof process.stdout.write;
  let code: number;
  try {
    code = await runUpdate({
      cwd: repo, strategy: opts.strategy ?? null, dryRun: opts.dryRun ?? false, quiet: false, importMetaUrl: url,
      retired: opts.retired ?? RETIRED,
    });
  } finally {
    process.stdout.write = orig;
  }
  return { code, out: chunks.join("") };
}

const manifestPath = () => path.join(repo, ".specforge", "manifest.json");
const tracked = async () =>
  (JSON.parse(await fs.readFile(manifestPath(), "utf8")).framework_files as { path: string }[]).map((f) => f.path);
const exists = async (rel: string) => fs.access(path.join(repo, rel)).then(() => true, () => false);

const B = { "CLAUDE.md": "# fixture\n", ".claude/rules/keep.md": "kept rule\n", "templates/contract.md": "# Contract\n" };

describe("update removes retired framework files", () => {
  it("1 an untouched retired file is removed with its emptied directory; kept files stay", async () => {
    await install();
    const r = await update(B);
    expect(r.code).toBe(0);
    expect(await exists(".claude/rules/old.md")).toBe(false);
    expect(await exists("templates/legacy/prd.md")).toBe(false);
    // Fails against removing only files: the emptied directory goes too.
    expect(await exists("templates/legacy")).toBe(false);
    expect(await exists(".claude/rules/keep.md")).toBe(true);
    expect(await exists("templates/contract.md")).toBe(true);
    expect(r.out).toMatch(/^remove {2}\.claude\/rules\/old\.md$/m);
    expect(r.out).toMatch(/^remove {2}templates\/legacy\/prd\.md$/m);
    expect(r.out).toMatch(/2 retired removed, 0 retired kept/);
    const t = await tracked();
    expect(t).not.toContain(".claude/rules/old.md");
    expect(t).toContain(".claude/rules/keep.md");
  });

  for (const strategy of [null, "ours", "theirs"] as const) {
    it(`2 an edited retired file is kept under strategy ${strategy ?? "none"}`, async () => {
      await install();
      await fs.writeFile(path.join(repo, ".claude/rules/old.md"), "old rule, edited by the team\n");
      const r = await update(B, { strategy });
      // Fails against treating an edited retired file as drift that halts the update.
      expect(r.code).toBe(0);
      expect(await fs.readFile(path.join(repo, ".claude/rules/old.md"), "utf8")).toBe("old rule, edited by the team\n");
      expect(r.out).toMatch(/^kept {4}\.claude\/rules\/old\.md \(edited; retired from the framework, no longer tracked\)$/m);
      expect(r.out).toMatch(/1 retired removed, 1 retired kept/);
      expect(await tracked()).not.toContain(".claude/rules/old.md");
    });
  }

  it("3 team data, untracked files and already-missing files are left alone", async () => {
    await install();
    // Plant manifest entries the bundle never ships: team data and a file removed by the team.
    for (const [rel, text] of [["SIBLINGS.md", "# Siblings\n"], ["001-x.md", "# PRD-001\n"]]) {
      await fs.writeFile(path.join(repo, rel), text);
    }
    const m = JSON.parse(await fs.readFile(manifestPath(), "utf8"));
    for (const rel of ["SIBLINGS.md", "001-x.md"]) {
      m.framework_files.push({ path: rel, sha256_at_install: await sha256OfFile(path.join(repo, rel)) });
    }
    await fs.writeFile(manifestPath(), JSON.stringify(m, null, 2) + "\n");
    await fs.rm(path.join(repo, "templates/legacy/prd.md"));
    await fs.writeFile(path.join(repo, ".claude/rules/mine.md"), "the team's own rule\n");
    // Every planted path is declared retired, so only the team-data, untracked and missing guards keep them.
    const r = await update(B, { retired: [...RETIRED, "SIBLINGS.md", "001-x.md", ".claude/rules/*.md"] });
    expect(r.code).toBe(0);
    // Fails against deleting every declared manifest path the bundle lacks.
    expect(await fs.readFile(path.join(repo, "SIBLINGS.md"), "utf8")).toBe("# Siblings\n");
    expect(await fs.readFile(path.join(repo, "001-x.md"), "utf8")).toBe("# PRD-001\n");
    expect(await fs.readFile(path.join(repo, ".claude/rules/mine.md"), "utf8")).toBe("the team's own rule\n");
    expect(r.out).not.toMatch(/remove {2}(SIBLINGS\.md|001-x\.md|\.claude\/rules\/mine\.md|templates\/legacy\/prd\.md)/);
    expect(r.out).toMatch(/1 retired removed, 0 retired kept/);
  });

  it("4 --dry-run lists removals and kept files and changes nothing", async () => {
    await install();
    await fs.writeFile(path.join(repo, "templates/legacy/prd.md"), "# PRD, edited\n");
    const before = await fs.readFile(manifestPath(), "utf8");
    const r = await update(B, { dryRun: true });
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/remove {2}\.claude\/rules\/old\.md/);
    expect(r.out).toMatch(/kept {4}templates\/legacy\/prd\.md/);
    // Fails against a dry run that deletes or rewrites the manifest.
    expect(await exists(".claude/rules/old.md")).toBe(true);
    expect(await fs.readFile(manifestPath(), "utf8")).toBe(before);
  });

  it("5 the repository root and a directory with a non-framework file are never removed", async () => {
    await install();
    await fs.writeFile(path.join(repo, ".claude/rules/mine.md"), "the team's own rule\n");
    const r = await update({}, { retired: ["CLAUDE.md", ".claude/**", "templates/**"] });
    expect(r.code).toBe(0);
    expect(await exists("")).toBe(true);
    expect(await exists(".specforge/manifest.json")).toBe(true);
    expect(await exists(".claude/rules/mine.md")).toBe(true);
    expect(await exists(".claude/rules/keep.md")).toBe(false);
    expect(await exists("templates")).toBe(false);
    expect(await tracked()).toEqual([]);
  });

  it("6 an undeclared dropped file stays as today, and a declared file still in the bundle is refreshed", async () => {
    await install();
    // B drops old.md and the legacy template, but declares only the template retired.
    const r = await update({ ...B, "templates/contract.md": "# Contract v2\n" }, { retired: ["templates/**"] });
    expect(r.code).toBe(0);
    // Fails against removing every untouched file the bundle dropped (pre-0.10 paths such as CHANGELOG.md).
    expect(await fs.readFile(path.join(repo, ".claude/rules/old.md"), "utf8")).toBe("old rule\n");
    expect(r.out).not.toMatch(/old\.md/);
    expect(await tracked()).not.toContain(".claude/rules/old.md");
    expect(await exists("templates/legacy/prd.md")).toBe(false);
    // Fails against removing a declared path the new bundle still ships.
    expect(await fs.readFile(path.join(repo, "templates/contract.md"), "utf8")).toBe("# Contract v2\n");
    expect(await tracked()).toContain("templates/contract.md");
  });
});
