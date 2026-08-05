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
import { mkTmpDir } from "../helpers.js";

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
      "agents/backend-reviewer.md",
      "examples/prd-001-login-example.md",
    ]) {
      expect(bundled, `${rel} must be bundled`).toContain(rel);
    }

    for (const rel of [
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

    // PRD-005 § 5.1: 32 framework files + VERSION. Adding a rule, template,
    // agent, or example moves this number — update it here and in § 5.1's
    // successor rather than loosening the assertion.
    expect(bundled).toHaveLength(33);
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
        "templates/prd.md",
        "agents/backend-reviewer.md",
        "examples/prd-001-login-example.md",
      ]) {
        const abs = path.join(repo, rel);
        await fs.mkdir(path.dirname(abs), { recursive: true });
        await fs.writeFile(abs, `fixture ${rel}\n`);
      }
      await fs.writeFile(
        path.join(fakeCliRoot, "package.json"),
        JSON.stringify({ name: "@angelkurten/specforge", version: "0.0.0" }, null, 2) + "\n",
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
