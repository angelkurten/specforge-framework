// Test helpers for @angelkurten/specforge CLI tests.
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

import { acquireLock, type LockHandle } from "../src/lock.js";

/**
 * Create a temporary directory and return its path.
 * The caller is responsible for cleanup.
 */
export async function mkTmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "specforge-test-"));
}

/**
 * Run a callback with a fresh temp directory, then clean up.
 */
export async function withTmpDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkTmpDir();
  try {
    return await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

/**
 * Acquire a lock, run callback, then release. Ensures the lock is
 * always cleaned up (avoids leaking SIGINT/SIGTERM handlers).
 */
export async function withLock<T>(
  cwd: string,
  command: "init" | "update" | "migrate",
  fn: (handle: LockHandle) => Promise<T>,
): Promise<T> {
  const handle = await acquireLock(cwd, command);
  try {
    return await fn(handle);
  } finally {
    await handle.release();
  }
}

/**
 * Returns an import.meta.url-shaped string that, when passed to
 * bundleRoot(), resolves to `<fakePkgDir>/framework`.
 *
 * The fake-pkg layout is:
 *   tests/fixtures/fake-pkg/
 *     dist/cli.js   (virtual — the file doesn't need to exist)
 *     framework/    (actual synth-bundle content)
 */
export function synthBundleImportMetaUrl(): string {
  const fakePkgDir = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    "fixtures",
    "fake-pkg",
  );
  // bundleRoot resolves: path.dirname(fileURLToPath(url)) -> "../framework"
  // so url must point at <fakePkgDir>/dist/something.js
  const fakeCli = path.join(fakePkgDir, "dist", "cli.js");
  return pathToFileURL(fakeCli).href;
}

/**
 * Build a synthetic framework-bundle directory inside `parent` with a chosen
 * VERSION. Returns an `importMetaUrl`-shaped string pointing at
 * `<parent>/fake-pkg/dist/cli.js`. The bundle contains a minimal
 * framework tree (CLAUDE.md, VERSION) — enough for `bundleVersion()` and the
 * migrate command's bundle lookup.
 */
export async function synthBundleAt(
  parent: string,
  version: string,
): Promise<string> {
  const pkg = path.join(parent, "fake-pkg");
  const framework = path.join(pkg, "framework");
  await fs.mkdir(framework, { recursive: true });
  await fs.mkdir(path.join(pkg, "dist"), { recursive: true });
  await fs.writeFile(path.join(framework, "VERSION"), `${version}\n`);
  await fs.writeFile(
    path.join(framework, "CLAUDE.md"),
    "# specforge (synth-bundle fixture for tests)\n",
  );
  const fakeCli = path.join(pkg, "dist", "cli.js");
  return pathToFileURL(fakeCli).href;
}

/**
 * The 14 subagent definitions of PRD-006 § 6.2 + the two `-implementer` rows
 * PRD-010 § 6.1 appends, as name/model/tools triples. Tests plant these
 * rather than reading the repo's real `.claude/agents/specforge/` tree: a
 * unit test that asserts against shipped content is a conformance test
 * wearing the wrong hat, and it would couple every validator assertion to
 * whatever the framework currently ships.
 *
 * The two new rows mirror the shipped `tools` string (`Read, Edit, Write,
 * Grep, Glob, Bash, WebFetch`) rather than the fixture's existing — already
 * stale — reviewer convention (`Read, Grep, Glob, Bash`, missing PRD-008's
 * `WebFetch`). Nothing here asserts on `.tools` content today
 * (`subagent-frontmatter.ts` never inspects the field, and the two
 * integration suites that consume this fixture read only `.name`), so the
 * choice is inert for the current suite either way; it is made in favor of
 * the shipped truth rather than perpetuating a divergence already flagged
 * as stale, since a future test that does start asserting on `.tools`
 * should not inherit a second, deliberately-introduced staleness.
 */
export const SUBAGENT_DEFINITIONS: ReadonlyArray<{
  name: string;
  model: string;
  tools: string;
}> = [
  { name: "specforge-backend-reviewer", model: "opus", tools: "Read, Grep, Glob, Bash" },
  { name: "specforge-security-reviewer", model: "opus", tools: "Read, Grep, Glob, Bash" },
  { name: "specforge-frontend-reviewer", model: "sonnet", tools: "Read, Grep, Glob, Bash" },
  { name: "specforge-quality-reviewer", model: "sonnet", tools: "Read, Grep, Glob, Bash" },
  { name: "specforge-roadmap-market-generator", model: "sonnet", tools: "Read, Grep, Glob" },
  { name: "specforge-roadmap-ux-generator", model: "sonnet", tools: "Read, Grep, Glob" },
  { name: "specforge-roadmap-product-generator", model: "sonnet", tools: "Read, Grep, Glob" },
  { name: "specforge-roadmap-support-generator", model: "sonnet", tools: "Read, Grep, Glob" },
  { name: "specforge-roadmap-evidence-critic", model: "opus", tools: "Read, Grep, Glob" },
  { name: "specforge-roadmap-risk-critic", model: "opus", tools: "Read, Grep, Glob" },
  { name: "specforge-roadmap-devils-advocate-critic", model: "sonnet", tools: "Read, Grep, Glob" },
  { name: "specforge-roadmap-opportunity-cost-critic", model: "sonnet", tools: "Read, Grep, Glob" },
  {
    name: "specforge-backend-implementer",
    model: "sonnet",
    tools: "Read, Edit, Write, Grep, Glob, Bash, WebFetch",
  },
  {
    name: "specforge-frontend-implementer",
    model: "sonnet",
    tools: "Read, Edit, Write, Grep, Glob, Bash, WebFetch",
  },
];

/** One definition file's bytes, shaped like the shipped ones. */
export function subagentDefinition(
  name: string,
  model = "sonnet",
  tools = "Read, Grep, Glob",
): string {
  return (
    `---\n` +
    `name: ${name}\n` +
    `description: "Test fixture for ${name}. Dispatched explicitly by the specforge workflow with a structured brief, not intended for automatic delegation."\n` +
    `model: ${model}\n` +
    `tools: ${tools}\n` +
    `---\n\n# ${name}\n\nFixture body.\n`
  );
}

/**
 * Plant the 14 definitions into `dir` (an absolute path). Returns the
 * absolute paths written.
 */
export async function plantSubagentDefinitions(dir: string): Promise<string[]> {
  await fs.mkdir(dir, { recursive: true });
  const written: string[] = [];
  for (const d of SUBAGENT_DEFINITIONS) {
    const abs = path.join(dir, `${d.name}.md`);
    await fs.writeFile(abs, subagentDefinition(d.name, d.model, d.tools));
    written.push(abs);
  }
  return written;
}

/**
 * Write a minimal valid manifest to a tmpdir.
 */
export async function writeMinimalManifest(
  cwd: string,
  overrides: Record<string, unknown> = {},
): Promise<void> {
  const manifest = {
    schema_version: "1",
    framework_version: "0.7.0",
    installed_at: new Date().toISOString(),
    last_updated_at: new Date().toISOString(),
    last_doctor_at: null,
    framework_files: [],
    migrations_applied: [],
    ...overrides,
  };
  const dir = path.join(cwd, ".specforge");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
}
