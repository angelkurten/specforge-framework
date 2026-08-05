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
  // Partial specification is the hazard. Any explicit option means the caller
  // is not asking for the real publish, but the roots keep defaulting to the
  // real tree: `{ frameworkFiles: [] }` alone would recursively delete the real
  // tools/cli/framework/ and rewrite the real package.json, then report success.
  // So an explicit anything requires explicit roots, and the roots come as a
  // pair — one without the other reads from one tree and writes to another.
  const explicit = Object.entries(opts)
    .filter(([, v]) => v !== undefined)
    .map(([k]) => k);
  if (explicit.length > 0 && (opts.repoRoot === undefined || opts.cliRoot === undefined)) {
    throw new Error(
      `prepublish: ${explicit.join(", ")} supplied without both repoRoot and cliRoot — ` +
        "an explicit option must name the tree it reads from and the tree it writes to",
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
  const expected = [...new Set([...framework.paths, ...bundleOnly.paths])].sort();

  // A run that resolves nothing must not report success: the tarball's
  // contents are decided here, and an empty bundle ships a CLI that cannot
  // resolve its own version.
  if (expected.length === 0) {
    process.stderr.write(
      `prepublish: resolved 0 files to bundle from ${repoRoot} — refusing to write an empty bundle\n`,
    );
    return 1;
  }

  for (const rel of expected) {
    await copyFile(repoRoot, bundleRoot, rel);
  }

  // Step 6: the bundle on disk must be exactly what was resolved. Comparing
  // the set — not merely the count, and not merely non-emptiness — is what
  // catches a copy that silently did not land or a stale file that survived
  // step 3, either of which would ship in a provenance-attested tarball.
  const onDisk = (await walkDir(bundleRoot, "")).sort();
  if (onDisk.length !== expected.length || onDisk.some((p, i) => p !== expected[i])) {
    const missing = expected.filter((p) => !onDisk.includes(p));
    const unexpected = onDisk.filter((p) => !expected.includes(p));
    process.stderr.write(
      `prepublish: bundle at ${bundleRoot} does not match the resolved file set\n`,
    );
    for (const m of missing) process.stderr.write(`  missing     ${m}\n`);
    for (const u of unexpected) process.stderr.write(`  unexpected  ${u}\n`);
    return 1;
  }

  process.stdout.write(`prepublish: bundled framework v${version} (${expected.length} files) into ${path.relative(cliRoot, bundleRoot)}/\n`);
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

/**
 * Run only when invoked as a script; importing must stay side-effect-free.
 *
 * There is deliberately no "looks like it should have run" fallback here: a
 * heuristic on the entry's name has no reachable true positive once both
 * operands are realpath'd, and it kills any unrelated file that happens to
 * share this basename. The "ran but did nothing" shape is covered inside
 * `runPrepublish` by the empty-set refusal and the bundle-vs-resolved-set
 * comparison, both of which return non-zero.
 */
if (isProcessEntry()) {
  runPrepublish()
    .then((code) => process.exit(code))
    .catch((err) => {
      process.stderr.write(`prepublish: ${err instanceof Error ? err.stack : String(err)}\n`);
      process.exit(1);
    });
}
