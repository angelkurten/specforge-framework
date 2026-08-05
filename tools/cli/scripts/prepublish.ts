// Prepublish: copy the framework tree from the repo root into
// tools/cli/framework/. PRD-003 § 7.2, PRD-005 § 6.2.
//
// 1. Read VERSION from the repo root.
// 2. Write the same value into tools/cli/package.json's `version`.
// 3. Import the framework list and the bundle-only list from src/partition.ts.
// 4. Copy each enumerated path from repo root into tools/cli/framework/,
//    preserving relative paths. Glob patterns (`**`) are expanded.
// 5. Exit non-zero if any required file is missing.

import { promises as fs } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { BUNDLE_ONLY_FILES, FRAMEWORK_FILES } from "../src/partition.js";

const here = path.dirname(fileURLToPath(import.meta.url));
// `here` is <pkg>/scripts when run from source but <pkg>/dist-scripts/scripts
// when compiled (tsconfig.scripts.json outDir) — hop the extra level.
const parent = path.resolve(here, "..");
const DEFAULT_CLI_ROOT =
  path.basename(parent) === "dist-scripts" ? path.resolve(parent, "..") : parent;
const DEFAULT_REPO_ROOT = path.resolve(DEFAULT_CLI_ROOT, "..", "..");

/**
 * FRAMEWORK_FILES patterns whose absence is acceptable on some checkouts.
 * Keep this narrow: every entry silently excuses a missing file, so an entry
 * that is no longer reachable from FRAMEWORK_FILES must be deleted rather
 * than left behind (PRD-005 § 10 step 2).
 *
 * BUNDLE_ONLY_FILES entries are never excused — a missing one is fatal.
 */
export const OPTIONAL: ReadonlySet<string> = new Set(["README.es.md"]);

export interface PrepublishOptions {
  /** Repo root the framework tree is read from. Defaults to the real repo. */
  repoRoot?: string;
  /** Package root the bundle and package.json are written to. */
  cliRoot?: string;
  /** Overridable for tests; defaults to the partition's FRAMEWORK_FILES. */
  frameworkFiles?: ReadonlyArray<string>;
  /** Overridable for tests; defaults to the partition's BUNDLE_ONLY_FILES. */
  bundleOnlyFiles?: ReadonlyArray<string>;
}

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

async function resolveEntry(
  repoRoot: string,
  pattern: string,
): Promise<{ paths: string[]; missing: string[] }> {
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

async function resolveList(
  repoRoot: string,
  patterns: ReadonlyArray<string>,
): Promise<{ paths: string[]; missing: string[] }> {
  const paths: string[] = [];
  const missing: string[] = [];
  for (const pat of patterns) {
    const r = await resolveEntry(repoRoot, pat);
    paths.push(...r.paths);
    missing.push(...r.missing);
  }
  return { paths, missing };
}

async function copyFile(
  repoRoot: string,
  bundleRoot: string,
  rel: string,
): Promise<void> {
  const src = path.join(repoRoot, rel);
  const dst = path.join(bundleRoot, rel);
  await fs.mkdir(path.dirname(dst), { recursive: true });
  const bytes = await fs.readFile(src);
  await fs.writeFile(dst, bytes);
}

export async function runPrepublish(
  opts: PrepublishOptions = {},
): Promise<number> {
  const repoRoot = opts.repoRoot ?? DEFAULT_REPO_ROOT;
  const cliRoot = opts.cliRoot ?? DEFAULT_CLI_ROOT;
  const frameworkFiles = opts.frameworkFiles ?? FRAMEWORK_FILES;
  const bundleOnlyFiles = opts.bundleOnlyFiles ?? BUNDLE_ONLY_FILES;
  const bundleRoot = path.join(cliRoot, "framework");

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

  // Step 4: resolve both lists. Framework entries may be excused by OPTIONAL;
  // bundle-only entries never are — the bundle must carry them or the tarball
  // ships a CLI that cannot resolve its own version (PRD-005 § 4.3).
  const framework = await resolveList(repoRoot, frameworkFiles);
  const bundleOnly = await resolveList(repoRoot, bundleOnlyFiles);

  const fatalMissing = framework.missing.filter((p) => !OPTIONAL.has(p));
  if (fatalMissing.length > 0) {
    process.stderr.write(`prepublish: required framework files missing:\n`);
    for (const m of fatalMissing) process.stderr.write(`  ${m}\n`);
    return 1;
  }
  if (bundleOnly.missing.length > 0) {
    process.stderr.write(`prepublish: required bundle-only files missing:\n`);
    for (const m of bundleOnly.missing) process.stderr.write(`  ${m}\n`);
    return 1;
  }
  if (framework.missing.length > 0) {
    process.stderr.write(`prepublish: optional framework files missing (continuing):\n`);
    for (const m of framework.missing) process.stderr.write(`  ${m}\n`);
  }

  // Step 5: copy.
  const allPaths = [...framework.paths, ...bundleOnly.paths];
  for (const rel of allPaths) {
    await copyFile(repoRoot, bundleRoot, rel);
  }

  process.stdout.write(`prepublish: bundled framework v${version} (${allPaths.length} files) into ${path.relative(cliRoot, bundleRoot)}/\n`);
  return 0;
}

/**
 * Run only when invoked as a script (`node dist-scripts/scripts/prepublish.js`).
 * Importing the module — which the integration tests do — must not execute it.
 */
const invokedDirectly =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  runPrepublish()
    .then((code) => process.exit(code))
    .catch((err) => {
      process.stderr.write(`prepublish: ${err instanceof Error ? err.stack : String(err)}\n`);
      process.exit(1);
    });
}
