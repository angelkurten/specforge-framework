// v1 leaves the package. Scenarios 1-3 of
// specforge/changes/2026-11-01-v1-package-swap/contract.md, numbered the same way.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkTmpDir } from "../helpers.js";
import { runPrepublish } from "../../scripts/prepublish.js";
import { runInit } from "../../src/commands/init.js";
import { runUpdate } from "../../src/commands/update.js";
import { RETIRED_FILES, isRetired } from "../../src/partition.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

const V1_RULES = ["hard-rules", "workflow", "gate-block", "prd-authoring", "roadmap", "model-selection", "adr-specific", "framework-maintenance"];
const V1_AGENTS = [
  "backend-reviewer", "frontend-reviewer", "security-reviewer", "quality-reviewer",
  "backend-implementer", "frontend-implementer",
  "roadmap-market-generator", "roadmap-ux-generator", "roadmap-product-generator", "roadmap-support-generator",
  "roadmap-evidence-critic", "roadmap-risk-critic", "roadmap-devils-advocate-critic", "roadmap-opportunity-cost-critic",
];
export const MOVED: string[] = [
  ...V1_RULES.map((r) => `.claude/rules/${r}.md`),
  ...V1_AGENTS.map((a) => `.claude/agents/specforge/specforge-${a}.md`),
  ...["prd", "adr", "agdr", "roadmap", "system-artifact"].map((t) => `templates/${t}.md`),
  "examples/prd-001-login-example.md",
  "examples/system-artifact-example.md",
  "CONVENTIONS.md",
  "scripts/prd-check.py",
];
const REQUIRED = [
  ".claude/rules/specforge.md",
  ".claude/agents/specforge/specforge-reviewer.md",
  "templates/contract.md", "templates/evidence-report.md", "templates/progress.md", "templates/decision-log.md",
  "examples/contract-example.md",
];

async function walk(dir: string, rel = ""): Promise<string[]> {
  const out: string[] = [];
  for (const e of await fs.readdir(path.join(dir, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...(await walk(dir, r)));
    else out.push(r);
  }
  return out;
}

let cliRoot: string;
let bundled: string[];
let prepublishCode: number;

beforeAll(async () => {
  cliRoot = await mkTmpDir();
  await fs.mkdir(path.join(cliRoot, "dist"), { recursive: true });
  await fs.writeFile(path.join(cliRoot, "package.json"),
    JSON.stringify({ name: "@angelkurten/specforge", version: "0.0.0" }, null, 2) + "\n");
  const err = process.stderr.write.bind(process.stderr);
  process.stderr.write = (() => true) as typeof process.stderr.write;
  try {
    prepublishCode = await runPrepublish({ repoRoot: REPO, cliRoot });
  } finally {
    process.stderr.write = err;
  }
  bundled = prepublishCode === 0 ? await walk(path.join(cliRoot, "framework")) : [];
}, 120000);

afterAll(async () => {
  await fs.rm(cliRoot, { recursive: true, force: true });
});

describe("v1-package-swap", () => {
  it("1 prepublish exits 0 and its bundle holds v2 only", () => {
    // Fails against an empty examples/ glob root (fatal in prepublish) and against bundling v1.
    expect(prepublishCode).toBe(0);
    for (const rel of MOVED) expect(bundled, rel).not.toContain(rel);
    for (const rel of REQUIRED) expect(bundled, rel).toContain(rel);
  });

  it("2 every moved path is retired, and nothing retired ships", () => {
    expect(MOVED).toHaveLength(31);
    for (const rel of MOVED) expect(RETIRED_FILES, rel).toContain(rel);
    for (const rel of bundled) expect(isRetired(rel), rel).toBe(false);
  });

  it("3 an update from a 0.30.0-shaped install removes v1, keeps edits, and halts on a drifted CLAUDE.md", async () => {
    const tmp = await mkTmpDir();
    try {
      // The old bundle: the new one plus every moved file, read from wherever it sits now.
      const oldPkg = path.join(tmp, "old");
      await fs.mkdir(path.join(oldPkg, "dist"), { recursive: true });
      await fs.cp(path.join(cliRoot, "framework"), path.join(oldPkg, "framework"), { recursive: true });
      for (const rel of MOVED) {
        const there = [path.join(REPO, rel), path.join(REPO, "history/v1", rel.replace(/^\.claude\//, "claude/"))];
        const src = (await Promise.all(there.map((p) => fs.access(p).then(() => p, () => null)))).find(Boolean);
        expect(src, `no source for ${rel}`).toBeTruthy();
        await fs.mkdir(path.dirname(path.join(oldPkg, "framework", rel)), { recursive: true });
        await fs.copyFile(src!, path.join(oldPkg, "framework", rel));
      }
      const oldUrl = pathToFileURL(path.join(oldPkg, "dist", "cli.js")).href;
      const newUrl = pathToFileURL(path.join(cliRoot, "dist", "cli.js")).href;
      const quiet = { strategy: null, dryRun: false, quiet: true } as const;
      const install = async (name: string) => {
        const repo = path.join(tmp, name);
        await fs.mkdir(repo);
        expect(await runInit({ cwd: repo, force: false, erase: false, noGitSafety: true, dryRun: false, quiet: true, importMetaUrl: oldUrl })).toBe(0);
        return repo;
      };
      const exists = (p: string) => fs.access(p).then(() => true, () => false);
      // Untouched: every moved file goes, exit 0. Moved files the CLI does not classify still go.
      const a = await install("a");
      expect(await runUpdate({ cwd: a, ...quiet, importMetaUrl: newUrl })).toBe(0);
      for (const rel of MOVED) expect(await exists(path.join(a, rel)), rel).toBe(false);
      // An edited v1 rule is kept, with its kept line, and the others go.
      const b = await install("b");
      await fs.appendFile(path.join(b, ".claude/rules/hard-rules.md"), "\nteam edit\n");
      const lines: string[] = [];
      const out = process.stdout.write.bind(process.stdout);
      process.stdout.write = ((c: string | Uint8Array) => { lines.push(String(c)); return true; }) as typeof process.stdout.write;
      let code: number;
      try {
        code = await runUpdate({ cwd: b, strategy: null, dryRun: false, quiet: false, importMetaUrl: newUrl });
      } finally {
        process.stdout.write = out;
      }
      expect(code).toBe(0);
      expect(lines.join("")).toMatch(/kept {4}\.claude\/rules\/hard-rules\.md \(edited;/);
      expect(await exists(path.join(b, ".claude/rules/hard-rules.md"))).toBe(true);
      expect(await exists(path.join(b, ".claude/rules/workflow.md"))).toBe(false);
      // An edited CLAUDE.md halts with no strategy and is replaced under theirs.
      const c = await install("c");
      await fs.appendFile(path.join(c, "CLAUDE.md"), "\nteam edit\n");
      expect(await runUpdate({ cwd: c, ...quiet, importMetaUrl: newUrl })).toBe(1);
      expect(await exists(path.join(c, ".claude/rules/workflow.md"))).toBe(true);
      expect(await runUpdate({ cwd: c, strategy: "theirs", dryRun: false, quiet: true, importMetaUrl: newUrl })).toBe(0);
      expect(await fs.readFile(path.join(c, "CLAUDE.md"), "utf8")).toBe(await fs.readFile(path.join(cliRoot, "framework", "CLAUDE.md"), "utf8"));
      expect(await exists(path.join(c, ".claude/rules/workflow.md"))).toBe(false);
      // An adopter's own .claude/rules/specforge.md is drift, never overwritten without a strategy.
      const d = await install("d");
      await fs.rm(path.join(d, ".claude/rules/specforge.md"), { force: true });
      await fs.writeFile(path.join(d, ".claude/rules/specforge.md"), "the team's own rule\n");
      const m = JSON.parse(await fs.readFile(path.join(d, ".specforge/manifest.json"), "utf8"));
      m.framework_files = m.framework_files.filter((f: { path: string }) => f.path !== ".claude/rules/specforge.md");
      await fs.writeFile(path.join(d, ".specforge/manifest.json"), JSON.stringify(m, null, 2) + "\n");
      expect(await runUpdate({ cwd: d, ...quiet, importMetaUrl: newUrl })).toBe(1);
      expect(await fs.readFile(path.join(d, ".claude/rules/specforge.md"), "utf8")).toBe("the team's own rule\n");
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  }, 120000);
});
