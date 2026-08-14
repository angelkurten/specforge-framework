// PRD-005 § 9 rows 5, 6, 7: what the publish step puts in the tarball.
//
// `runPrepublish` is driven against the real repo root but with a throwaway
// cliRoot, so the tests never clobber the dev bundle at tools/cli/framework/.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { spawnSync } from "node:child_process";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { BUNDLE_ONLY_FILES, FRAMEWORK_FILES } from "../../src/partition.js";
import { OPTIONAL, runPrepublish } from "../../scripts/prepublish.js";
import { mkTmpDir, SUBAGENT_DEFINITIONS } from "../helpers.js";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);

/** Every regular file under `dir`, as POSIX paths relative to it. */
async function walk(dir: string, rel = ""): Promise<string[]> {
  const out: string[] = [];
  let entries;
  try {
    entries = await fs.readdir(path.join(dir, rel), { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const childRel = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...(await walk(dir, childRel)));
    else if (e.isFile()) out.push(childRel);
  }
  return out.sort();
}

let cliRoot: string;

beforeEach(async () => {
  cliRoot = await mkTmpDir();
  await fs.writeFile(
    path.join(cliRoot, "package.json"),
    JSON.stringify({ name: "@angelkurten/specforge", version: "0.0.0" }, null, 2) + "\n",
  );
});

afterEach(async () => {
  await fs.rm(cliRoot, { recursive: true, force: true });
});

describe("prepublish: bundles the reduced framework set plus VERSION", () => {
  it("carries VERSION and every retained path, and none of the seven vacated ones", async () => {
    const stderr: string[] = [];
    const origErr = process.stderr.write.bind(process.stderr);
    process.stderr.write = (chunk: any) => {
      stderr.push(String(chunk));
      return true;
    };
    let code: number;
    try {
      code = await runPrepublish({ repoRoot: REPO_ROOT, cliRoot });
    } finally {
      process.stderr.write = origErr;
    }
    expect(code, stderr.join("")).toBe(0);

    const bundled = await walk(path.join(cliRoot, "framework"));

    // Bundle-only: present in the tarball, excluded from what init writes.
    expect(bundled).toContain("VERSION");

    for (const rel of [
      "CLAUDE.md",
      "CONVENTIONS.md",
      "README.md",
      "README.es.md",
      "LICENSE",
      ".claude/rules/hard-rules.md",
      ".claude/rules/workflow.md",
      "templates/prd.md",
      "examples/prd-001-login-example.md",
      // PRD-006 § 9 row 7: all fourteen asserted by name. A symlinked
      // definition drops silently from `walkDir`, so a total alone would not
      // catch a 13-file bundle.
      ...SUBAGENT_DEFINITIONS.map(
        (d) => `.claude/agents/specforge/${d.name}.md`,
      ),
    ]) {
      expect(bundled, `${rel} must be bundled`).toContain(rel);
    }

    for (const rel of [
      "agents/backend-reviewer.md",
      "agents/roadmap-market-generator.md",
      "CHANGELOG.md",
      "mkdocs.yml",
      "requirements-docs.txt",
      "scripts/upgrade.sh",
      ".github/workflows/cli-release.yml",
      ".github/workflows/specforge-ci.yml",
    ]) {
      expect(bundled, `${rel} must not be bundled`).not.toContain(rel);
    }
    expect(bundled.filter((p) => p.startsWith("docs/"))).toEqual([]);

    // PRD-012 phase 3: bundled, but never written by a plain `init` — it is
    // absent from the framework list above and lands only on `--headless`.
    expect(bundled).toContain("optional-rules/headless-session.md");

    // PRD-005 § 5.1: 32 framework files + VERSION. PRD-006 swapped twelve
    // briefings for twelve subagent definitions, so the count was unchanged
    // there. PRD-010 § 6.2 row 8 adds two more subagent definitions
    // (specforge-backend-implementer, specforge-frontend-implementer),
    // moving the count from 33 to 35. PRD-012 phase 3 adds the bundle-only
    // headless rule, 35 to 36. Adding a rule, template, definition, or
    // example moves this number — update it here and in § 5.1's successor
    // rather than loosening the assertion.
    expect(bundled).toHaveLength(36);
  });
});

// PRD-012 phase 3 § 5.3: `npm install -g --ignore-scripts <tarball>` runs as
// root during the sandbox image build. A bundled `npm-shrinkwrap.json` does
// NOT govern that install — measured: npm honours a shrinkwrap only when the
// package is the project root, and resolves ranges live when it is a
// dependency. `bundleDependencies` is what actually pins the closure; the
// shrinkwrap remains the record of which versions were bundled.
describe("prepublish: the runtime closure is pinned", () => {
  it("every runtime dependency is bundled and pinned to one exact version", async () => {
    const pkg = JSON.parse(
      await fs.readFile(path.join(REPO_ROOT, "tools/cli/package.json"), "utf8"),
    );
    const sw = JSON.parse(
      await fs.readFile(path.join(REPO_ROOT, "tools/cli/npm-shrinkwrap.json"), "utf8"),
    );

    const deps = Object.keys(pkg.dependencies).sort();
    expect(
      [...(pkg.bundleDependencies ?? [])].sort(),
      "every runtime dependency must be bundled, or it resolves live as root at image-build time",
    ).toEqual(deps);

    for (const name of deps) {
      const meta = sw.packages[`node_modules/${name}`];
      expect(meta, `${name} missing from the shrinkwrap`).toBeDefined();
      expect(meta.version, `${name} carries no resolved version`).toMatch(/^\d+\.\d+\.\d+/);
      expect(meta.integrity, `${name} carries no integrity hash`).toMatch(/^sha\d+-/);
      expect(meta.dev, `${name} must not be a dev entry`).toBeUndefined();
    }
    // `yaml` is the one on a caret range, so it is the one that would
    // otherwise resolve live.
    expect(pkg.dependencies.yaml).toMatch(/^\^/);
  });

  it("stamps the repo VERSION into the shrinkwrap as well as package.json", async () => {
    const stale = {
      name: "@angelkurten/specforge",
      version: "0.0.0-stale",
      lockfileVersion: 3,
      requires: true,
      packages: { "": { name: "@angelkurten/specforge", version: "0.0.0-stale" } },
    };
    await fs.writeFile(
      path.join(cliRoot, "npm-shrinkwrap.json"),
      JSON.stringify(stale, null, 2) + "\n",
    );

    const code = await runPrepublish({ repoRoot: REPO_ROOT, cliRoot });
    expect(code).toBe(0);

    const version = (await fs.readFile(path.join(REPO_ROOT, "VERSION"), "utf8")).trim();
    const pkg = JSON.parse(await fs.readFile(path.join(cliRoot, "package.json"), "utf8"));
    const sw = JSON.parse(await fs.readFile(path.join(cliRoot, "npm-shrinkwrap.json"), "utf8"));
    expect(pkg.version).toBe(version);
    expect(sw.version).toBe(version);
    expect(sw.packages[""].version).toBe(version);
  });
});

describe("prepublish: OPTIONAL carries no unreachable entries", () => {
  it("every OPTIONAL entry is still reachable from FRAMEWORK_FILES or BUNDLE_ONLY_FILES", () => {
    const reachable = new Set([...FRAMEWORK_FILES, ...BUNDLE_ONLY_FILES]);
    for (const entry of OPTIONAL) {
      expect(
        reachable.has(entry),
        `OPTIONAL entry ${entry} matches neither list — it can only excuse a future missing file`,
      ).toBe(true);
    }
  });

  it("no BUNDLE_ONLY_FILES entry is excusable", () => {
    for (const entry of BUNDLE_ONLY_FILES) {
      expect(OPTIONAL.has(entry), `${entry} must be fatal-on-missing`).toBe(false);
    }
  });
});

describe("prepublish: a partially-specified call is refused", () => {
  // Every case here is destructive if the guard is removed: with no roots the
  // real tools/cli/framework/ is what gets recursively deleted and the real
  // package.json is what gets rewritten. `repoRoot` therefore points at a
  // tmpdir, never the live repo, so the roots cases stay safe to mutate; the
  // list-only cases have no root to redirect, so the sentinel below is what
  // makes damage visible instead of silent.
  let fixtureRepo: string;
  let bundleFilesBefore: number;

  const countRealBundle = async (): Promise<number> => {
    try {
      return (await walk(path.join(REPO_ROOT, "tools", "cli", "framework"))).length;
    } catch {
      return 0;
    }
  };

  beforeEach(async () => {
    fixtureRepo = await mkTmpDir();
    bundleFilesBefore = await countRealBundle();
  });

  afterEach(async () => {
    await fs.rm(fixtureRepo, { recursive: true, force: true });
  });

  it("throws when either root is supplied without the other", async () => {
    await expect(runPrepublish({ repoRoot: fixtureRepo })).rejects.toThrow(
      /without both repoRoot and cliRoot/,
    );
    await expect(runPrepublish({ cliRoot })).rejects.toThrow(
      /without both repoRoot and cliRoot/,
    );
    expect(await countRealBundle()).toBe(bundleFilesBefore);
  });

  it("throws when a list override arrives without explicit roots", async () => {
    // The roots would silently default to the real tree while the caller only
    // meant to narrow the file list — the shape that wiped a 10-file bundle
    // down to framework/VERSION and still returned 0.
    await expect(runPrepublish({ frameworkFiles: [] })).rejects.toThrow(
      /frameworkFiles.*without both repoRoot and cliRoot/,
    );
    await expect(runPrepublish({ bundleOnlyFiles: [] })).rejects.toThrow(
      /bundleOnlyFiles.*without both repoRoot and cliRoot/,
    );
    await expect(runPrepublish({ frameworkFiles: [], cliRoot })).rejects.toThrow(
      /without both repoRoot and cliRoot/,
    );
    // The sentinel: if a future edit weakens the guard, this fails loudly
    // instead of the suite quietly eating the bundle.
    expect(await countRealBundle()).toBe(bundleFilesBefore);
  });
});

describe("prepublish: refuses to report success on an empty bundle", () => {
  it("exits non-zero when the lists resolve to zero files", async () => {
    const emptyRepo = await mkTmpDir();
    try {
      await fs.writeFile(path.join(emptyRepo, "VERSION"), "9.9.9\n");
      const stderr: string[] = [];
      const origErr = process.stderr.write.bind(process.stderr);
      process.stderr.write = (chunk: any) => {
        stderr.push(String(chunk));
        return true;
      };
      let code: number;
      try {
        code = await runPrepublish({
          repoRoot: emptyRepo,
          cliRoot,
          frameworkFiles: [],
          bundleOnlyFiles: [],
        });
      } finally {
        process.stderr.write = origErr;
      }
      expect(code).not.toBe(0);
      expect(stderr.join("")).toContain("refusing to write an empty bundle");
    } finally {
      await fs.rm(emptyRepo, { recursive: true, force: true });
    }
  });
});

describe("prepublish: a symlinked invocation is not silently skipped", () => {
  // Regression guard for the entry-point check. With a lexically-resolved
  // argv[1] the comparison against the loader's already-realpath'd
  // import.meta.url fails, the module loads, nothing runs, and the process
  // exits 0 having written no bundle — which at release time publishes a
  // stale or absent framework tree. Driven through spawnSync because the
  // failure only exists when the script IS the process entry.
  const DIST_SCRIPTS = path.join(REPO_ROOT, "tools", "cli", "dist-scripts");

  it("runs the real script through a symlink and bundles into its own tree", async () => {
    if (process.platform === "win32") return;
    if (!(await fs.access(path.join(DIST_SCRIPTS, "scripts", "prepublish.js")).then(() => true, () => false))) {
      // In CI the build always precedes the test run, so an absent dist-scripts/
      // means the workflow changed — fail rather than let the guard become a
      // permanent silent no-op.
      if (process.env.CI) throw new Error("dist-scripts/ not built — run pnpm build before pnpm test");
      console.warn("DEVIATION: dist-scripts/ not built; symlink regression test skipped");
      return;
    }

    const tmp = await mkTmpDir();
    try {
      // A self-contained fake repo so the run never touches the real tree:
      // <tmp>/repo/{VERSION,framework files...} + <tmp>/repo/tools/cli/dist-scripts.
      const repo = path.join(tmp, "repo");
      const fakeCliRoot = path.join(repo, "tools", "cli");
      await fs.mkdir(fakeCliRoot, { recursive: true });
      await fs.writeFile(path.join(repo, "VERSION"), "9.9.9\n");
      for (const rel of [
        "CLAUDE.md",
        "CONVENTIONS.md",
        "README.md",
        "README.es.md",
        "LICENSE",
        ".claude/rules/hard-rules.md",
        // The namespace must exist in the fixture repo: `resolveEntry`
        // reports an absent `dir/**` base as missing, and a missing
        // framework entry is fatal unless it is in OPTIONAL.
        ".claude/agents/specforge/specforge-backend-reviewer.md",
        "templates/prd.md",
        "examples/prd-001-login-example.md",
        // A bundle-only entry is never excused when missing, so the fixture
        // tree has to carry every one of them or the run fails at step 4.
        "optional-rules/headless-session.md",
      ]) {
        const abs = path.join(repo, rel);
        await fs.mkdir(path.dirname(abs), { recursive: true });
        await fs.writeFile(abs, `fixture ${rel}\n`);
      }
      await fs.writeFile(
        path.join(fakeCliRoot, "package.json"),
        // "type": "module" matters: without it Node emits a
        // MODULE_TYPELESS_PACKAGE_JSON warning on every run, stderr is never
        // empty, and the silent-shape assertion below can never fail.
        JSON.stringify({ name: "@angelkurten/specforge", version: "0.0.0", type: "module" }, null, 2) + "\n",
      );
      // dist-scripts carries both scripts/prepublish.js and src/partition.js,
      // so copying it wholesale keeps the fixture self-contained.
      await fs.cp(DIST_SCRIPTS, path.join(fakeCliRoot, "dist-scripts"), { recursive: true });

      const linkDir = path.join(tmp, "symlinked");
      await fs.mkdir(linkDir, { recursive: true });
      const linked = path.join(linkDir, "prepublish.js");
      await fs.symlink(
        path.join(fakeCliRoot, "dist-scripts", "scripts", "prepublish.js"),
        linked,
      );

      const r = spawnSync(process.execPath, [linked], { encoding: "utf8", timeout: 30000 });
      const output = `${r.stdout ?? ""}${r.stderr ?? ""}`;

      // The failure being guarded: exit 0 having printed nothing at all.
      expect(
        r.status === 0 && output.trim() === "",
        "symlinked invocation exited 0 without running — the entry-point check regressed",
      ).toBe(false);

      // And the positive: it ran to completion against its own fixture tree.
      expect(r.status, output).toBe(0);
      expect(output).toContain("bundled framework v9.9.9");
      const bundled = await walk(path.join(fakeCliRoot, "framework"));
      expect(bundled).toContain("VERSION");
      expect(bundled).toContain("CLAUDE.md");
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  }, 60000);
});

describe("prepublish: fails closed on a missing bundle-only file", () => {
  it("exits non-zero and names the entry", async () => {
    // Deliberately not VERSION: a missing repo-root VERSION hard-fails at
    // step 1 before either list is resolved, so a VERSION fixture would pass
    // whether or not the bundle-only loop is fatal-on-missing.
    const phantom = "__prd005-absent-bundle-only__.txt";
    await expect(fs.access(path.join(REPO_ROOT, phantom))).rejects.toThrow();

    const stderr: string[] = [];
    const origErr = process.stderr.write.bind(process.stderr);
    process.stderr.write = (chunk: any) => {
      stderr.push(String(chunk));
      return true;
    };
    let code: number;
    try {
      code = await runPrepublish({
        repoRoot: REPO_ROOT,
        cliRoot,
        bundleOnlyFiles: ["VERSION", phantom],
      });
    } finally {
      process.stderr.write = origErr;
    }

    expect(code).not.toBe(0);
    const out = stderr.join("");
    expect(out).toContain("bundle-only");
    expect(out).toContain(phantom);
  });
});
