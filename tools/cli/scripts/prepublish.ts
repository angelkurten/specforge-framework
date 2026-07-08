// Prepublish: copy the framework tree from the repo root into
// tools/cli/framework/. PRD-003 § 7.2.
//
// 1. Read VERSION from the repo root.
// 2. Write the same value into tools/cli/package.json's `version`.
// 3. Import the framework list from src/partition.ts.
// 4. Copy each enumerated path from repo root into tools/cli/framework/,
//    preserving relative paths. Glob patterns (`**`) are expanded.
// 5. Exit non-zero if any required file is missing.

import { promises as fs } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { FRAMEWORK_FILES } from "../src/partition.js";

const here = path.dirname(fileURLToPath(import.meta.url));
// `here` is <pkg>/scripts when run from source but <pkg>/dist-scripts/scripts
// when compiled (tsconfig.scripts.json outDir) — hop the extra level.
const parent = path.resolve(here, "..");
const cliRoot = path.basename(parent) === "dist-scripts" ? path.resolve(parent, "..") : parent;
const repoRoot = path.resolve(cliRoot, "..", "..");
const bundleRoot = path.join(cliRoot, "framework");

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function walkDir(absDir: string, relPrefix: string): Promise<string[]> {
  const out: string[] = [];
  let entries;
  try {
    entries = await fs.readdir(absDir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const childAbs = path.join(absDir, e.name);
    const childRel = relPrefix ? `${relPrefix}/${e.name}` : e.name;
    if (e.isDirectory()) {
      const nested = await walkDir(childAbs, childRel);
      for (const n of nested) out.push(n);
    } else if (e.isFile()) {
      out.push(childRel);
    }
  }
  return out;
}

async function resolveEntry(pattern: string): Promise<{ paths: string[]; missing: string[] }> {
  if (pattern.endsWith("/**")) {
    const baseRel = pattern.slice(0, -3);
    const baseAbs = path.join(repoRoot, baseRel);
    if (!(await exists(baseAbs))) {
      return { paths: [], missing: [pattern] };
    }
    const inner = await walkDir(baseAbs, baseRel);
    return { paths: inner, missing: [] };
  }
  const abs = path.join(repoRoot, pattern);
  if (await exists(abs)) {
    return { paths: [pattern], missing: [] };
  }
  return { paths: [], missing: [pattern] };
}

async function copyFile(rel: string): Promise<void> {
  const src = path.join(repoRoot, rel);
  const dst = path.join(bundleRoot, rel);
  await fs.mkdir(path.dirname(dst), { recursive: true });
  const bytes = await fs.readFile(src);
  await fs.writeFile(dst, bytes);
}

async function main(): Promise<number> {
  // Step 1: VERSION.
  const versionPath = path.join(repoRoot, "VERSION");
  if (!(await exists(versionPath))) {
    process.stderr.write("prepublish: VERSION file missing at repo root\n");
    return 1;
  }
  const version = (await fs.readFile(versionPath, "utf8")).trim();

  // Step 2: bump package.json version.
  const pkgPath = path.join(cliRoot, "package.json");
  const pkgRaw = await fs.readFile(pkgPath, "utf8");
  const pkg = JSON.parse(pkgRaw);
  pkg.version = version;
  await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");

  // Step 3: clear and recreate the bundle directory.
  await fs.rm(bundleRoot, { recursive: true, force: true });
  await fs.mkdir(bundleRoot, { recursive: true });

  // Step 4: resolve and copy.
  const allPaths: string[] = [];
  const allMissing: string[] = [];
  for (const pat of FRAMEWORK_FILES) {
    const r = await resolveEntry(pat);
    allPaths.push(...r.paths);
    allMissing.push(...r.missing);
  }

  // Patterns that are inherently optional (their absence is acceptable on
  // some checkouts) — keep this list narrow.
  const OPTIONAL = new Set([
    "scripts/upgrade.sh",
    "mkdocs.yml",
    "requirements-docs.txt",
    "docs/**",
    ".github/workflows/cli-release.yml",
    ".github/workflows/specforge-ci.yml",
    "CHANGELOG.md",
    "README.es.md",
  ]);
  const fatalMissing = allMissing.filter((p) => !OPTIONAL.has(p));
  if (fatalMissing.length > 0) {
    process.stderr.write(`prepublish: required framework files missing:\n`);
    for (const m of fatalMissing) process.stderr.write(`  ${m}\n`);
    return 1;
  }
  if (allMissing.length > 0) {
    process.stderr.write(`prepublish: optional framework files missing (continuing):\n`);
    for (const m of allMissing) process.stderr.write(`  ${m}\n`);
  }

  for (const rel of allPaths) {
    await copyFile(rel);
  }

  process.stdout.write(`prepublish: bundled framework v${version} (${allPaths.length} files) into ${path.relative(cliRoot, bundleRoot)}/\n`);
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    process.stderr.write(`prepublish: ${err instanceof Error ? err.stack : String(err)}\n`);
    process.exit(1);
  });
