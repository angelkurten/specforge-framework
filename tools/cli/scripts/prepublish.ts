// Prepublish: copy the framework tree from the repo root into
// tools/cli/framework/. PRD-003 § 7.2, PRD-005 § 6.2.
//
// 1. Read VERSION from the repo root.
// 2. Write the same value into tools/cli/package.json's `version`.
// 3. Import the framework list and the bundle-only list from src/partition.ts.
// 4. Copy each enumerated path from repo root into tools/cli/framework/,
//    preserving relative paths. Glob patterns (`**`) are expanded.
// 5. Exit non-zero if any required file is missing.

import { promises as fs, realpathSync } from "node:fs";
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
  // `repoRoot` and `cliRoot` are read-from and written-to respectively, so
  // defaulting them independently would let `{ repoRoot: fixture }` recursively
  // delete the real tools/cli/framework/ and rewrite the real package.json from
  // the fixture's VERSION. Either both are supplied or neither is.
  if ((opts.repoRoot === undefined) !== (opts.cliRoot === undefined)) {
    throw new Error(
      "prepublish: repoRoot and cliRoot must be supplied together — " +
        "one without the other would read from one tree and write to another",
    );
  }
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

  // A run that resolves nothing must not report success: the tarball's
  // contents are decided here, and an empty bundle ships a CLI that cannot
  // resolve its own version.
  if (allPaths.length === 0) {
    process.stderr.write(
      `prepublish: resolved 0 files to bundle from ${repoRoot} — refusing to write an empty bundle\n`,
    );
    return 1;
  }

  for (const rel of allPaths) {
    await copyFile(repoRoot, bundleRoot, rel);
  }

  process.stdout.write(`prepublish: bundled framework v${version} (${allPaths.length} files) into ${path.relative(cliRoot, bundleRoot)}/\n`);
  return 0;
}

const SELF_PATH = fileURLToPath(import.meta.url);

/**
 * Whether this module is the process entry point.
 *
 * Node's ESM loader has already realpath'd `import.meta.url`, so comparing it
 * against a merely lexically-resolved `process.argv[1]` returns false whenever
 * the script is reached through a symlinked path — and a false result here is
 * silent: nothing runs, the process exits 0, and a provenance-attested publish
 * proceeds on a stale or absent bundle. Realpath both operands so the two
 * spellings of the same file compare equal.
 */
function isProcessEntry(): boolean {
  const argv1 = process.argv[1];
  if (argv1 === undefined) return false;
  try {
    return realpathSync(path.resolve(argv1)) === realpathSync(SELF_PATH);
  } catch {
    // `node -e`, a virtual entry, or a deleted argv[1]: not this script.
    return false;
  }
}

/** Run only when invoked as a script; importing must stay side-effect-free. */
if (isProcessEntry()) {
  runPrepublish()
    .then(async (code) => {
      if (code !== 0) return code;
      // Belt and braces: a zero exit must mean files actually landed. If the
      // bundle is empty here, something skipped the copy and the publish must
      // not proceed quietly.
      const bundled = await walkDir(path.join(DEFAULT_CLI_ROOT, "framework"), "");
      if (bundled.length === 0) {
        process.stderr.write(
          "prepublish: reported success but the bundle is empty — refusing to exit 0\n",
        );
        return 1;
      }
      return 0;
    })
    .then((code) => process.exit(code))
    .catch((err) => {
      process.stderr.write(`prepublish: ${err instanceof Error ? err.stack : String(err)}\n`);
      process.exit(1);
    });
} else if (
  process.argv[1] !== undefined &&
  path.basename(process.argv[1]) === path.basename(SELF_PATH)
) {
  // The entry point is named like this script but did not resolve to it. That
  // is the silent-skip shape; fail loudly instead of exiting 0 having done
  // nothing.
  process.stderr.write(
    `prepublish: refusing to skip silently — process entry ${process.argv[1]} ` +
      `did not resolve to ${SELF_PATH}\n`,
  );
  process.exit(1);
}
