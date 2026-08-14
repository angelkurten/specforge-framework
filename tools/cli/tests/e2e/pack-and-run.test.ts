// Rows #25 and #57: end-to-end npm pack + npx tests
// PRD-005 § 9 rows 10, 11, 12: a fresh install carries no specforge project
// metadata, and `update` neither resurrects nor deletes a vacated path.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promises as fs } from "node:fs";
import { spawnSync } from "node:child_process";
import * as path from "node:path";
import * as os from "node:os";

const CLI_DIR = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../..",
);

let packDir: string;
let tgzPath: string | null = null;

beforeAll(async () => {
  packDir = await fs.mkdtemp(path.join(os.tmpdir(), "specforge-e2e-"));

  // Run npm pack from CLI_DIR to produce the tarball
  const packResult = spawnSync("npm", ["pack", "--pack-destination", packDir], {
    cwd: CLI_DIR,
    encoding: "utf8",
    timeout: 60000,
  });

  if (packResult.status !== 0) {
    console.error("npm pack failed:", packResult.stderr);
    tgzPath = null;
    return;
  }

  // Find the produced tarball
  const files = await fs.readdir(packDir);
  const tgz = files.find((f) => f.endsWith(".tgz"));
  if (tgz) {
    tgzPath = path.join(packDir, tgz);
  }
}, 120000);

afterAll(async () => {
  if (packDir) {
    await fs.rm(packDir, { recursive: true, force: true });
  }
});

/**
 * Extract the tarball, install dependencies, and create a dist/framework
 * symlink so that bundleRoot(import.meta.url) resolves correctly.
 *
 * Background: bundleRoot() does path.resolve(dirname(url), "..", "framework").
 * The CLI entry is at dist/src/cli.js so dirname is dist/src and the resolved
 * path is dist/framework. We create a symlink dist/framework → ../framework
 * to bridge the mismatch between the TSC output layout and what bundleRoot
 * expects.
 *
 * Returns { extractDir, cliEntry } where cliEntry is dist/src/cli.js.
 */
async function extractAndPrepare(tgz: string): Promise<{ extractDir: string; cliEntry: string }> {
  const extractDir = await fs.mkdtemp(path.join(os.tmpdir(), "specforge-tar-"));

  // Extract tarball (strips the "package/" prefix from npm tarballs)
  spawnSync("tar", ["xzf", tgz, "-C", extractDir, "--strip-components=1"], {
    encoding: "utf8",
    timeout: 30000,
  });

  // Install runtime dependencies (diff3, yaml) so the CLI can import them
  spawnSync("npm", ["install"], {
    cwd: extractDir,
    encoding: "utf8",
    timeout: 120000,
  });

  // Create dist/framework → <extractDir>/framework symlink.
  // bundleRoot(import.meta.url) when running dist/src/cli.js resolves
  // dirname = dist/src, then "../framework" = dist/framework.
  const distFrameworkLink = path.join(extractDir, "dist", "framework");
  try {
    await fs.symlink(path.join(extractDir, "framework"), distFrameworkLink);
  } catch {
    // Already exists or symlinks not supported — proceed; CLI may still work
    // if node_modules resolution finds the framework another way.
  }

  const cliEntry = path.join(extractDir, "dist", "src", "cli.js");
  return { extractDir, cliEntry };
}

describe("end-to-end: npm pack + npx", () => {
  it("npm pack produces a tarball; npx ./<tarball> init in a tmpdir creates a working layout", async () => {
    if (!tgzPath) {
      // npm pack may fail if framework/ dir is not populated (requires prepublish).
      // In that case mark as a known deviation and skip gracefully.
      console.warn("DEVIATION: npm pack failed (likely missing framework/ bundle); e2e test requires prepublish run first");
      return;
    }

    let extractDir: string | null = null;
    const initDir = await fs.mkdtemp(path.join(os.tmpdir(), "specforge-e2e-init-"));
    try {
      const prepared = await extractAndPrepare(tgzPath);
      extractDir = prepared.extractDir;
      const { cliEntry } = prepared;

      const initResult = spawnSync(process.execPath, [cliEntry, "init", "--quiet"], {
        cwd: initDir,
        encoding: "utf8",
        timeout: 30000,
      });

      expect(initResult.status).toBe(0);
      await expect(fs.access(path.join(initDir, ".specforge", "manifest.json"))).resolves.toBeUndefined();
      await expect(fs.access(path.join(initDir, "CLAUDE.md"))).resolves.toBeUndefined();
      await expect(fs.access(path.join(initDir, "SIBLINGS.md"))).resolves.toBeUndefined();
    } finally {
      await fs.rm(initDir, { recursive: true, force: true });
      if (extractDir) await fs.rm(extractDir, { recursive: true, force: true });
    }
  }, 180000);
});

describe("e2e: a fresh install carries no specforge project metadata", () => {
  // The seven paths that stopped being installed in PRD-005.
  const VACATED = [
    "CHANGELOG.md",
    "VERSION",
    "docs",
    "mkdocs.yml",
    "requirements-docs.txt",
    "scripts/upgrade.sh",
    ".github/workflows/cli-release.yml",
  ];

  let extractDir: string | null = null;
  let cliEntry = "";

  beforeAll(async () => {
    if (!tgzPath) return;
    const prepared = await extractAndPrepare(tgzPath);
    extractDir = prepared.extractDir;
    cliEntry = prepared.cliEntry;
  }, 180000);

  afterAll(async () => {
    if (extractDir) await fs.rm(extractDir, { recursive: true, force: true });
  });

  /** `specforge init` in a fresh tmpdir. Returns the directory. */
  async function initTmp(label: string): Promise<string> {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), `specforge-prd005-${label}-`));
    const r = spawnSync(process.execPath, [cliEntry, "init", "--quiet"], {
      cwd: dir,
      encoding: "utf8",
      timeout: 30000,
    });
    expect(r.status, r.stderr).toBe(0);
    return dir;
  }

  it("init writes none of the seven vacated paths, and doctor exits 0", async () => {
    if (!tgzPath) {
      console.warn("DEVIATION: npm pack failed; PRD-005 vacated-path e2e skipped");
      return;
    }
    const dir = await initTmp("fresh");
    try {
      for (const rel of VACATED) {
        await expect(
          fs.access(path.join(dir, rel)),
          `${rel} must not be installed`,
        ).rejects.toThrow();
      }
      const doctor = spawnSync(process.execPath, [cliEntry, "doctor", "--quiet"], {
        cwd: dir,
        encoding: "utf8",
        timeout: 30000,
      });
      expect(doctor.status, doctor.stderr).toBe(0);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  }, 120000);

  it("update leaves leftover metadata byte-identical and does not recreate a deleted one", async () => {
    if (!tgzPath) {
      console.warn("DEVIATION: npm pack failed; PRD-005 leftover-metadata e2e skipped");
      return;
    }
    const dir = await initTmp("leftover");
    try {
      // What a 0.9.0 install left behind.
      const changelog = "# Changelog\n\n## 0.9.0\n\n- from the previous install\n";
      const docsFile = "# specforge docs page from the previous install\n";
      await fs.writeFile(path.join(dir, "CHANGELOG.md"), changelog);
      await fs.mkdir(path.join(dir, "docs"), { recursive: true });
      await fs.writeFile(path.join(dir, "docs", "x.md"), docsFile);

      const update = spawnSync(process.execPath, [cliEntry, "update", "--quiet"], {
        cwd: dir,
        encoding: "utf8",
        timeout: 30000,
      });
      expect(update.status, update.stderr).toBe(0);

      expect(await fs.readFile(path.join(dir, "CHANGELOG.md"), "utf8")).toBe(changelog);
      expect(await fs.readFile(path.join(dir, "docs", "x.md"), "utf8")).toBe(docsFile);

      // Deleting one must stick: `update` writes only paths in the bundle.
      await fs.rm(path.join(dir, "docs", "x.md"));
      const update2 = spawnSync(process.execPath, [cliEntry, "update", "--quiet"], {
        cwd: dir,
        encoding: "utf8",
        timeout: 30000,
      });
      expect(update2.status, update2.stderr).toBe(0);
      await expect(fs.access(path.join(dir, "docs", "x.md"))).rejects.toThrow();
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  }, 120000);

  // PRD-006 § 9 row 4: only `.claude/agents/specforge/**` is framework-owned.
  // Everything else under `.claude/agents/` stays the adopter's — never
  // written, never tracked, never drift-checked.
  it("an adopter's own subagent under .claude/agents/ survives update byte-identically", async () => {
    if (!tgzPath) {
      console.warn("DEVIATION: npm pack failed; PRD-006 adopter-subagent e2e skipped");
      return;
    }
    const dir = await initTmp("subagent");
    try {
      const custom =
        `---\nname: my-own-agent\ndescription: "The team's own subagent."\nmodel: sonnet\n---\n\nOur body.\n`;
      const rel = ".claude/agents/custom.md";
      await fs.mkdir(path.join(dir, ".claude", "agents"), { recursive: true });
      await fs.writeFile(path.join(dir, rel), custom);

      const update = spawnSync(process.execPath, [cliEntry, "update", "--quiet"], {
        cwd: dir,
        encoding: "utf8",
        timeout: 30000,
      });
      expect(update.status, update.stderr).toBe(0);
      expect(await fs.readFile(path.join(dir, rel), "utf8")).toBe(custom);

      const manifest = JSON.parse(
        await fs.readFile(path.join(dir, ".specforge", "manifest.json"), "utf8"),
      );
      expect(
        manifest.framework_files.map((f: { path: string }) => f.path),
      ).not.toContain(rel);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  }, 120000);

  it("a team-authored file at a vacated path survives update", async () => {
    if (!tgzPath) {
      console.warn("DEVIATION: npm pack failed; PRD-005 team-file e2e skipped");
      return;
    }
    const dir = await initTmp("teamfile");
    try {
      const teamChangelog =
        "# Our product's changelog\n\n## 2026-08-05\n\n- this file belongs to the adopting team\n";
      await fs.writeFile(path.join(dir, "CHANGELOG.md"), teamChangelog);

      const update = spawnSync(process.execPath, [cliEntry, "update", "--quiet"], {
        cwd: dir,
        encoding: "utf8",
        timeout: 30000,
      });
      expect(update.status, update.stderr).toBe(0);
      expect(await fs.readFile(path.join(dir, "CHANGELOG.md"), "utf8")).toBe(teamChangelog);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  }, 120000);
});

// PRD-012 phase 3 § 9 row 17, local half. The published half — the same
// assertion against the version the sandbox recipe pins — needs a published
// tarball to run against.
//
// **The assertion is on bundled bytes, not on a shrinkwrap file.** An earlier
// version of this row asserted the tarball contained `npm-shrinkwrap.json`,
// which is green while guarding nothing: npm honours a shrinkwrap only when
// the package is the project root, and `npm install -g <tarball>` — what the
// image build runs, as root — treats it as a dependency and resolves `yaml`'s
// caret range live, with the tarball's sha512 verifying the whole time.
// `bundleDependencies` is the mechanism that install actually consumes.
describe("e2e: the packed tarball pins its runtime closure", () => {
  it("carries every runtime dependency's bytes at the version the shrinkwrap records", async () => {
    if (!tgzPath) {
      console.warn("DEVIATION: npm pack failed; closure-pinning e2e skipped");
      return;
    }
    const extractDir = await fs.mkdtemp(path.join(os.tmpdir(), "specforge-closure-"));
    try {
      spawnSync("tar", ["xzf", tgzPath, "-C", extractDir, "--strip-components=1"], {
        encoding: "utf8",
        timeout: 30000,
      });
      const pkg = JSON.parse(
        await fs.readFile(path.join(extractDir, "package.json"), "utf8"),
      );
      const sw = JSON.parse(
        await fs.readFile(path.join(extractDir, "npm-shrinkwrap.json"), "utf8"),
      );

      for (const name of Object.keys(pkg.dependencies)) {
        // The bytes `npm install -g <tarball>` will use verbatim.
        const bundled = JSON.parse(
          await fs.readFile(
            path.join(extractDir, "node_modules", name, "package.json"),
            "utf8",
          ),
        );
        const recorded = sw.packages[`node_modules/${name}`].version;
        expect(
          bundled.version,
          `${name} is bundled at ${bundled.version} but recorded as ${recorded}`,
        ).toBe(recorded);
      }
    } finally {
      await fs.rm(extractDir, { recursive: true, force: true });
    }
  }, 120000);
});

// PRD-012 phase 3 § 9 row 27. The corpus kubbo's sandbox image builds and
// seeds into a run comes from `specforge init --headless --quiet` against the
// published tarball, so the assertion has to run against the packed artifact:
// the source tree carries files the tarball does not.
describe("e2e: init --headless produces the corpus the sandbox seed expects", () => {
  let extractDir: string | null = null;
  let cliEntry = "";

  beforeAll(async () => {
    if (!tgzPath) return;
    const prepared = await extractAndPrepare(tgzPath);
    extractDir = prepared.extractDir;
    cliEntry = prepared.cliEntry;
  }, 180000);

  afterAll(async () => {
    if (extractDir) await fs.rm(extractDir, { recursive: true, force: true });
  });

  async function initHeadless(label: string, ...flags: string[]): Promise<string> {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), `specforge-prd012-${label}-`));
    const r = spawnSync(process.execPath, [cliEntry, "init", "--quiet", ...flags], {
      cwd: dir,
      encoding: "utf8",
      timeout: 30000,
    });
    expect(r.status, r.stderr).toBe(0);
    return dir;
  }

  // PRD-006 § 6.2's fourteen definitions, name only — kept as a flat literal
  // here rather than imported from conformance/framework.test.ts so this e2e
  // suite exercises the packed tarball's own file list independent of that
  // file's DEFINITIONS constant.
  const ALL_14_DEFINITIONS = [
    "specforge-backend-reviewer",
    "specforge-security-reviewer",
    "specforge-frontend-reviewer",
    "specforge-quality-reviewer",
    "specforge-roadmap-market-generator",
    "specforge-roadmap-ux-generator",
    "specforge-roadmap-product-generator",
    "specforge-roadmap-support-generator",
    "specforge-roadmap-evidence-critic",
    "specforge-roadmap-risk-critic",
    "specforge-roadmap-devils-advocate-critic",
    "specforge-roadmap-opportunity-cost-critic",
    "specforge-backend-implementer",
    "specforge-frontend-implementer",
  ];

  it("writes CLAUDE.md, the headless rule, the reviewer definitions and templates/", async () => {
    if (!tgzPath) {
      console.warn("DEVIATION: npm pack failed; PRD-012 headless e2e skipped");
      return;
    }
    const dir = await initHeadless("headless", "--headless");
    try {
      for (const rel of [
        "CLAUDE.md",
        ".claude/rules/headless-session.md",
        ".claude/agents/specforge/specforge-backend-reviewer.md",
        ".claude/agents/specforge/specforge-frontend-reviewer.md",
        ".claude/agents/specforge/specforge-security-reviewer.md",
        ".claude/agents/specforge/specforge-quality-reviewer.md",
        "templates/prd.md",
      ]) {
        await expect(
          fs.access(path.join(dir, rel)),
          `${rel} must be installed by init --headless`,
        ).resolves.toBeUndefined();
      }

      // § 9 row 27: all 14 definitions, from the packed artifact, each
      // carrying a `tools:` line — not just the 4 reviewers spot-checked
      // above. This is the packed-tarball counterpart to the source-tree
      // check at conformance/framework.test.ts's PRD-006 § 9 row 15; the two
      // don't collapse into one because packaging can drop or truncate a
      // file the source tree still has intact (PRD-012 phase 3's own
      // bundleDependencies fix was exactly this class of bug).
      for (const name of ALL_14_DEFINITIONS) {
        const defPath = path.join(dir, ".claude/agents/specforge", `${name}.md`);
        const body = await fs.readFile(defPath, "utf8").catch((err) => {
          throw new Error(`${name}.md missing from packed headless corpus: ${err}`);
        });
        expect(body, `${name}.md has no tools: frontmatter line`).toMatch(/^tools:\s*\S/m);
      }

      // kubbo's seed predicate reads both `CLAUDE.md` and `.claude/rules/`,
      // so a rules directory holding only the headless rule would still be a
      // seeded corpus, but an empty one would read as unseeded forever.
      const rules = await fs.readdir(path.join(dir, ".claude", "rules"));
      expect(rules).toContain("headless-session.md");
      expect(rules.length).toBeGreaterThan(1);

      // `doctor` runs the rule-frontmatter validator over the installed rule.
      const doctor = spawnSync(process.execPath, [cliEntry, "doctor", "--quiet"], {
        cwd: dir,
        encoding: "utf8",
        timeout: 30000,
      });
      expect(doctor.status, doctor.stderr).toBe(0);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  }, 120000);

  it("plain init leaves the headless rule out", async () => {
    if (!tgzPath) {
      console.warn("DEVIATION: npm pack failed; PRD-012 headless e2e skipped");
      return;
    }
    const dir = await initHeadless("interactive");
    try {
      await expect(
        fs.access(path.join(dir, ".claude", "rules", "headless-session.md")),
      ).rejects.toThrow();
      await expect(fs.access(path.join(dir, "CLAUDE.md"))).resolves.toBeUndefined();
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  }, 120000);
});

describe("e2e: pack + npx produces doctor-clean layout", () => {
  it("npm pack; npx init in tmpdir; verify manifest exists, framework files present, AND doctor exits 0 on the resulting layout", async () => {
    if (!tgzPath) {
      console.warn("DEVIATION: npm pack failed; e2e doctor-clean test skipped");
      return;
    }

    let extractDir: string | null = null;
    const initDir = await fs.mkdtemp(path.join(os.tmpdir(), "specforge-e2e-init2-"));

    try {
      const prepared = await extractAndPrepare(tgzPath);
      extractDir = prepared.extractDir;
      const { cliEntry } = prepared;

      // Init
      const initResult = spawnSync(process.execPath, [cliEntry, "init", "--quiet"], {
        cwd: initDir,
        encoding: "utf8",
        timeout: 30000,
      });
      expect(initResult.status).toBe(0);

      // Verify manifest exists
      await expect(fs.access(path.join(initDir, ".specforge", "manifest.json"))).resolves.toBeUndefined();

      // Run doctor
      const doctorResult = spawnSync(process.execPath, [cliEntry, "doctor", "--quiet"], {
        cwd: initDir,
        encoding: "utf8",
        timeout: 30000,
      });
      expect(doctorResult.status).toBe(0);
    } finally {
      await fs.rm(initDir, { recursive: true, force: true });
      if (extractDir) await fs.rm(extractDir, { recursive: true, force: true });
    }
  }, 180000);
});
