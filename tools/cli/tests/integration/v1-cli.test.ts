// v1 leaves the CLI. Scenarios 1-5 and 7 of
// specforge/changes/2026-11-02-v1-out-of-the-cli/contract.md, numbered the same way
// (6 is in tests/unit/yaml.test.ts, 8 in scripts/v1_cli_test.py).
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkTmpDir, synthBundleImportMetaUrl } from "../helpers.js";
import { runInit } from "../../src/commands/init.js";
import { runDoctor } from "../../src/commands/doctor.js";
import { classify } from "../../src/partition.js";
import { ALL_VALIDATORS } from "../../src/validators/index.js";
import { validator as ruleFrontmatter } from "../../src/validators/rule-frontmatter.js";

const CLI_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CLI_ENTRY = path.join(CLI_DIR, "dist/src/cli.js");
const src = (rel: string) => path.join(CLI_DIR, "src", rel);

const KEPT = [
  "manifest-present", "framework-file-integrity", "claude-md-size", "rule-frontmatter",
  "subagent-frontmatter", "lock-guard-registered", "stale-briefings",
];
const REMOVED = [
  "prd-numbering", "prd-required-sections", "prd-back-refs", "prd-marketing-language",
  "prd-system-artifact-diff", "siblings-paths-resolve", "gate-block-yaml",
  "roadmap-evidence-categories", "roadmap-pii",
];

let tmp: string;
beforeEach(async () => { tmp = await mkTmpDir(); });
afterEach(async () => { await fs.rm(tmp, { recursive: true, force: true }); });

const exists = (abs: string) => fs.lstat(abs).then(() => true, () => false);

/** Run `fn` with stdout and stderr captured. */
async function capture<T>(fn: () => Promise<T>): Promise<{ value: T; out: string }> {
  const chunks: string[] = [];
  const out = process.stdout.write.bind(process.stdout);
  const err = process.stderr.write.bind(process.stderr);
  const grab = ((c: string | Uint8Array) => { chunks.push(String(c)); return true; }) as typeof process.stdout.write;
  process.stdout.write = grab;
  process.stderr.write = grab;
  try {
    return { value: await fn(), out: chunks.join("") };
  } finally {
    process.stdout.write = out;
    process.stderr.write = err;
  }
}

const init = (cwd: string, extra: Partial<Parameters<typeof runInit>[0]> = {}, importMetaUrl = synthBundleImportMetaUrl()) =>
  capture(() => runInit({ cwd, force: false, erase: false, noGitSafety: true, dryRun: false, quiet: false, importMetaUrl, ...extra }));

const doctor = (cwd: string, rules: string[] = [], json = false) =>
  capture(() => runDoctor({ cwd, json, rules, quiet: true, importMetaUrl: synthBundleImportMetaUrl() } as Parameters<typeof runDoctor>[0]));

/** A bundle with README.md and LICENSE at its root, like the real one. */
async function bundleWithRootFiles(): Promise<string> {
  const pkg = path.join(tmp, "pkg");
  for (const [rel, text] of Object.entries({ VERSION: "1.0.0\n", "CLAUDE.md": "# c\n", "README.md": "# r\n", LICENSE: "l\n" })) {
    await fs.mkdir(path.dirname(path.join(pkg, "framework", rel)), { recursive: true });
    await fs.writeFile(path.join(pkg, "framework", rel), text);
  }
  return pathToFileURL(path.join(pkg, "dist", "cli.js")).href;
}

describe("v1 leaves the CLI", () => {
  it("1 doctor registers exactly the seven validators that stay; each removed id is unknown", async () => {
    expect([...ALL_VALIDATORS.map((v) => v.id)].sort()).toEqual([...KEPT].sort());
    for (const id of REMOVED) {
      const r = await doctor(tmp, [id]);
      // Fails against leaving the validator registered: doctor runs it instead of exiting 2.
      expect(r.value, id).toBe(2);
    }
    for (const helper of ["validators/gate-fence.ts", "validators/roadmap-parse.ts"]) {
      expect(await exists(src(helper)), helper).toBe(false);
    }
  });

  it("2 --ignore-sibling is an unknown flag, --help omits it, and the JSON is schema 2 without exclusions", async () => {
    const flag = spawnSync(process.execPath, [CLI_ENTRY, "doctor", "--ignore-sibling=x"], { cwd: tmp, encoding: "utf8" });
    expect(flag.status).toBe(2);
    expect(flag.stdout + flag.stderr).toMatch(/unknown flag/i);
    const help = spawnSync(process.execPath, [CLI_ENTRY, "help"], { encoding: "utf8" });
    expect(help.status).toBe(0);
    expect(help.stdout + help.stderr).not.toContain("ignore-sibling");
    await init(tmp);
    const r = await doctor(tmp, [], true);
    const report = JSON.parse(r.out);
    expect(report.schema_version).toBe("2");
    expect(report).not.toHaveProperty("exclusions");
    expect(await fs.readFile(src("cli.ts"), "utf8")).not.toContain("ignore-sibling");
    expect(await fs.readFile(src("validators/types.ts"), "utf8")).not.toContain("ignoreSiblings");
  });

  it("3 init writes no v1 placeholders, its dry run lists none, and its next steps name v2", async () => {
    const dry = await init(tmp, { dryRun: true });
    expect(dry.value).toBe(0);
    expect(dry.out).not.toMatch(/SIBLINGS\.md|ROADMAP\.md/);
    const listed = dry.out.split("\n").filter((l) => /^\s*write {3}/.test(l) && !l.includes(".specforge/manifest.json")).length;
    // Fails against keeping the two placeholders in the count (bundled + 3).
    expect(dry.out).toContain(`dry-run: ${listed + 1} files would be written`);
    const real = await init(tmp);
    expect(real.value, real.out).toBe(0);
    expect(await exists(path.join(tmp, "SIBLINGS.md"))).toBe(false);
    expect(await exists(path.join(tmp, "ROADMAP.md"))).toBe(false);
    const next = real.out.split("\n").find((l) => l.startsWith("next steps:")) ?? "";
    expect(next).toContain("specforge doctor");
    expect(next).toContain("/specforge-classify");
    expect(next).not.toMatch(/SIBLINGS|ROADMAP/);
    expect((await doctor(tmp)).value).toBe(0);
    const initSrc = await fs.readFile(src("commands/init.ts"), "utf8");
    expect(initSrc).not.toContain("TRACKED_TEAM_DATA");
    expect(initSrc).not.toContain("PRD-003");
    expect(await fs.readFile(src("cli.ts"), "utf8")).not.toContain("PRD-003");
  });

  it("4 the install probe ignores v1 files and refuses any entry the bundle would write", async () => {
    const url = await bundleWithRootFiles();
    for (const [name, text] of [["SIBLINGS.md", "# s\n"], ["001-x.md", "# PRD-001\n"]]) {
      const dir = path.join(tmp, `ok-${name}`);
      await fs.mkdir(dir);
      await fs.writeFile(path.join(dir, name), text);
      const r = await init(dir, {}, url);
      // Fails against today's probe, which treats SIBLINGS.md or a root NNN-*.md as an install.
      expect(r.value, `${name}: ${r.out}`).toBe(0);
      expect(await fs.readFile(path.join(dir, name), "utf8")).toBe(text);
    }
    const cases: Array<[string, (dir: string) => Promise<void>, (dir: string) => Promise<unknown>]> = [
      ["README.md", (d) => fs.writeFile(path.join(d, "README.md"), "mine\n"), (d) => fs.readFile(path.join(d, "README.md"), "utf8")],
      ["LICENSE", (d) => fs.writeFile(path.join(d, "LICENSE"), "mine\n"), (d) => fs.readFile(path.join(d, "LICENSE"), "utf8")],
      ["dangling README.md", (d) => fs.symlink("nowhere", path.join(d, "README.md")), (d) => fs.readlink(path.join(d, "README.md"))],
      [".specforge", async (d) => {
        await fs.mkdir(path.join(d, ".specforge"));
        await fs.writeFile(path.join(d, ".specforge/manifest.json"), "{}\n");
      }, (d) => fs.readFile(path.join(d, ".specforge/manifest.json"), "utf8")],
    ];
    for (const [label, plant, read] of cases) {
      const dir = path.join(tmp, `no-${label.replace(/\W/g, "_")}`);
      await fs.mkdir(dir);
      await plant(dir);
      const before = await read(dir);
      const r = await init(dir, {}, url);
      // Fails against a probe that does not check bundle paths, or checks them with a symlink-following access.
      expect(r.value, `${label}: ${r.out}`).toBe(2);
      expect(await read(dir), label).toEqual(before);
      expect(await exists(path.join(dir, "CLAUDE.md")), label).toBe(false);
    }
  });

  it("5 PRDs, ADRs and the v1 registry are no longer team data, and --erase leaves them", async () => {
    for (const rel of ["SIBLINGS.md", "ROADMAP.md", "001-x.md", "ADR-001-x.md", "AgDR-001-x.md"]) {
      expect(classify(rel), rel).toBe("unknown");
    }
    for (const rel of ["specforge/DECISIONS.md", "specforge/changes/x/contract.md"]) {
      expect(classify(rel), rel).toBe("team");
    }
    await init(tmp);
    await fs.writeFile(path.join(tmp, "001-x.md"), "# PRD-001\n");
    await fs.writeFile(path.join(tmp, "SIBLINGS.md"), "# s\n");
    const r = await init(tmp, { force: true, erase: true });
    expect(r.value, r.out).toBe(0);
    // Fails against keeping the PRD and SIBLINGS.md patterns in TEAM_DATA_PATTERNS: --erase deletes them.
    expect(await fs.readFile(path.join(tmp, "001-x.md"), "utf8")).toBe("# PRD-001\n");
    expect(await fs.readFile(path.join(tmp, "SIBLINGS.md"), "utf8")).toBe("# s\n");
  });

  it("7 rule-frontmatter rejects a paths: that is not a list, whatever the rule's name", async () => {
    const rules = path.join(tmp, ".claude/rules");
    await fs.mkdir(rules, { recursive: true });
    const rule = (paths: string) => `---\nname: x\ndescription: d\n${paths}---\n\nbody\n`;
    await fs.writeFile(path.join(rules, "as-string.md"), rule("paths: \"src/**\"\n"));
    await fs.writeFile(path.join(rules, "as-empty.md"), rule("paths:\n"));
    await fs.writeFile(path.join(rules, "as-list.md"), rule("paths:\n  - \"src/**\"\n"));
    await fs.writeFile(path.join(rules, "absent.md"), rule(""));
    const findings = await ruleFrontmatter.run(tmp, {});
    const errorFiles = findings.filter((f) => f.severity === "error").map((f) => path.basename(f.file ?? "")).sort();
    // Fails against keeping the check behind KNOWN_PATH_SCOPED: no generic name is checked at all.
    expect(errorFiles).toEqual(["as-empty.md", "as-string.md"]);
  });
});
