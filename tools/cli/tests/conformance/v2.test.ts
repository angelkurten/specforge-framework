// v2 conformance: the rows of the retired framework.test.ts that still apply,
// plus scenario 7 of specforge/changes/2026-11-01-v1-package-swap/contract.md.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { mkTmpDir } from "../helpers.js";
import { runPrepublish } from "../../scripts/prepublish.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const read = (rel: string) => fs.readFile(path.join(REPO, rel), "utf8");

const V1_RULES = ["hard-rules", "workflow", "gate-block", "prd-authoring", "roadmap", "model-selection", "adr-specific", "framework-maintenance"];
const V1_AGENTS = [
  "backend-reviewer", "frontend-reviewer", "security-reviewer", "quality-reviewer",
  "backend-implementer", "frontend-implementer",
  "roadmap-market-generator", "roadmap-ux-generator", "roadmap-product-generator", "roadmap-support-generator",
  "roadmap-evidence-critic", "roadmap-risk-critic", "roadmap-devils-advocate-critic", "roadmap-opportunity-cost-critic",
].map((a) => `specforge-${a}`);
const MOVED = [
  ...V1_RULES.map((r) => `.claude/rules/${r}.md`),
  ...V1_AGENTS.map((a) => `.claude/agents/specforge/${a}.md`),
  ...["prd", "adr", "agdr", "roadmap", "system-artifact"].map((t) => `templates/${t}.md`),
  "examples/prd-001-login-example.md", "examples/system-artifact-example.md", "CONVENTIONS.md", "scripts/prd-check.py",
];
const VACATED = ["VERSION", "CHANGELOG.md", "mkdocs.yml", "requirements-docs.txt", "scripts/upgrade.sh", "optional-rules/headless-session.md"];
const BASENAMES = ["hard-rules", "workflow.md", "gate-block", "prd-authoring", "model-selection", "adr-specific", "framework-maintenance"];
const READMES = ["README.md", "README.es.md", "tools/cli/README.md"];

async function walk(dir: string, rel = ""): Promise<string[]> {
  const out: string[] = [];
  for (const e of await fs.readdir(path.join(dir, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...(await walk(dir, r)));
    else out.push(r);
  }
  return out;
}

describe("PRD-016 phase 2 § 9 rows 12-13 — the release entry and the version pin", () => {
  let version: string;
  let changelog: string;
  beforeAll(async () => {
    version = (await read("VERSION")).trim();
    changelog = await read("CHANGELOG.md");
  });

  it("row 13 — VERSION and the committed tools/cli/package.json agree", () => {
    // The committed copy: globalSetup's npm pack re-stamps the working-tree package.json.
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    const pkg = JSON.parse(execFileSync("git", ["show", "HEAD:tools/cli/package.json"], { cwd: REPO, encoding: "utf8" }));
    expect(pkg.version).toBe(version);
  });

  it("row 12 — the newest CHANGELOG entry names VERSION, is dated, and states its headless blast radius", () => {
    const newest = /^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})\s*$/m.exec(changelog);
    expect(newest).not.toBeNull();
    expect(newest![1]).toBe(version);
    const at = changelog.indexOf(`## [${version}]`);
    const rest = changelog.slice(at);
    const next = /^## \[/m.exec(rest.slice(1));
    const body = next ? rest.slice(0, next.index + 1) : rest;
    const breaking = body.includes("**BREAKING for a headless installation**");
    const safe = /\*\*No behaviour change for a headless installation\.?\*\*/.test(body);
    expect(breaking || safe).toBe(true);
    expect(breaking && safe).toBe(false);
  });
});

describe("v1-package-swap scenario 7 — shipped v2 text carries no v1", () => {
  let cliRoot: string;
  let files: string[];
  beforeAll(async () => {
    cliRoot = await mkTmpDir();
    await fs.writeFile(path.join(cliRoot, "package.json"), JSON.stringify({ name: "@angelkurten/specforge", version: "0.0.0" }) + "\n");
    const err = process.stderr.write.bind(process.stderr);
    process.stderr.write = (() => true) as typeof process.stderr.write;
    let code: number;
    try {
      code = await runPrepublish({ repoRoot: REPO, cliRoot });
    } finally {
      process.stderr.write = err;
    }
    expect(code, "prepublish failed").toBe(0);
    files = (await walk(path.join(cliRoot, "framework"))).filter((f) => f !== "VERSION");
  }, 120000);
  afterAll(async () => {
    await fs.rm(cliRoot, { recursive: true, force: true });
  });

  it("no shipped file names a moved path or a v1 agent name", async () => {
    expect(files.length).toBeGreaterThan(10);
    const hits: string[] = [];
    for (const rel of files) {
      const text = await fs.readFile(path.join(cliRoot, "framework", rel), "utf8");
      for (const token of [...MOVED, ...V1_AGENTS]) if (text.includes(token)) hits.push(`${rel}: ${token}`);
    }
    // Fails against a shipped v2 file that still points an adopter at a removed v1 file or agent.
    expect(hits).toEqual([]);
  });

  it("no README names a vacated token, a docs/ link or a bare v1 rule basename", async () => {
    const hits: string[] = [];
    for (const rel of READMES) {
      const text = await read(rel);
      for (const token of [...VACATED, ...BASENAMES, "](docs/"]) if (text.includes(token)) hits.push(`${rel}: ${token}`);
    }
    expect(hits).toEqual([]);
  });

  it("the one shipped agent is specforge-reviewer with read-only tools and no delegation", async () => {
    const agents = files.filter((f) => f.startsWith(".claude/agents/"));
    expect(agents).toEqual([".claude/agents/specforge/specforge-reviewer.md"]);
    const text = await read(agents[0]);
    const front = text.split("---")[1] ?? "";
    expect(front).toMatch(/^name: specforge-reviewer$/m);
    expect(front).toMatch(/^model: inherit$/m);
    expect(front).toMatch(/^tools: Read, Grep, Glob, Bash$/m);
    expect(front).not.toMatch(/Agent|Task|Write|Edit/);
  });
});
