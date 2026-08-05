// PRD-005 § 9 rows 5, 6, 7: what the publish step puts in the tarball.
//
// `runPrepublish` is driven against the real repo root but with a throwaway
// cliRoot, so the tests never clobber the dev bundle at tools/cli/framework/.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
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

describe("prepublish: the roots cannot be split", () => {
  it("throws when repoRoot is supplied without cliRoot, and vice versa", async () => {
    // Splitting them would read the framework tree from one directory while
    // recursively deleting the bundle under — and rewriting the package.json
    // of — another.
    await expect(runPrepublish({ repoRoot: REPO_ROOT })).rejects.toThrow(
      /must be supplied together/,
    );
    await expect(runPrepublish({ cliRoot })).rejects.toThrow(/must be supplied together/);
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
