// `specforge init` — PRD-003 § 5.1, § 4.1.

import { promises as fs } from "node:fs";
import * as path from "node:path";

import {
  bundleFileAbs,
  bundleVersion,
  listBundledFrameworkFiles,
} from "../framework-bundle.js";
import { gitStatus } from "../git.js";
import { acquireLock, LockHeldError } from "../lock.js";
import {
  buildManifest,
  type FrameworkFileEntry,
  manifestExists,
  writeManifest,
} from "../manifest.js";
import { classify } from "../partition.js";
import { safeWriteFile } from "../safe-fs.js";
import { sha256OfFile } from "../sha.js";
import { info, printError, summary } from "../output.js";

export interface InitOptions {
  cwd: string;
  force: boolean;
  erase: boolean;
  noGitSafety: boolean;
  dryRun: boolean;
  quiet: boolean;
  importMetaUrl: string;
}

const TRACKED_TEAM_DATA = [".specforge", "SIBLINGS.md", "ROADMAP.md"];

async function cwdHasSpecforgeArtifacts(cwd: string): Promise<boolean> {
  const probes = [
    ".specforge",
    "CLAUDE.md",
    ".claude/rules",
    "SIBLINGS.md",
  ];
  for (const p of probes) {
    try {
      await fs.access(path.join(cwd, p));
      return true;
    } catch {
      // continue
    }
  }
  // Any root-level NNN-*.md PRD also counts.
  try {
    const entries = await fs.readdir(cwd, { withFileTypes: true });
    for (const e of entries) {
      if (e.isFile() && /^\d{3}-[a-z0-9][a-z0-9-]*\.md$/.test(e.name)) return true;
    }
  } catch {
    // ignore
  }
  return false;
}

async function listEraseTargets(cwd: string): Promise<string[]> {
  const out: string[] = [];

  async function walk(rel: string): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(path.join(cwd, rel || "."), {
        withFileTypes: true,
      });
    } catch {
      return;
    }
    for (const e of entries) {
      const childRel = rel ? `${rel}/${e.name}` : e.name;
      const klass = classify(childRel);
      if (klass === "framework" || klass === "team") {
        if (e.isFile()) out.push(childRel);
        else if (e.isDirectory()) await walk(childRel);
      } else if (e.isDirectory() && klass === "unknown") {
        await walk(childRel);
      }
    }
  }

  await walk("");
  return out;
}

export async function runInit(opts: InitOptions): Promise<number> {
  // Step 1: cwd-empty check (unless --force).
  if (!opts.force) {
    if (await cwdHasSpecforgeArtifacts(opts.cwd)) {
      printError({
        message: "cwd is not empty; refuse to install without --force",
        remediation:
          "run `specforge update` to refresh an existing install, or `specforge init --force` to overwrite",
        exitCode: 2,
      });
      return 2;
    }
  }

  // Step 2: --erase gating. PRD § 8.3 lists timeout / git-unavailable as
  // fail-closed modes that must refuse erase unconditionally — the double
  // opt-in only waives a *known-dirty* tree, never an unavailable git.
  if (opts.erase) {
    const envOk = process.env.SPECFORGE_ALLOW_DESTRUCTIVE === "1";
    const doubleOptIn = opts.noGitSafety && envOk;
    const status = await gitStatus(opts.cwd);
    // PRD § 8.3: genuine git unavailability (binary missing, timeout,
    // signal) is fail-closed; the double opt-in does not waive it. A
    // non-git cwd ("not-a-repo") is benign and proceeds.
    if (status.kind === "unavailable") {
      printError({
        message: `--erase refused: git status unavailable (${status.reason})`,
        remediation:
          "ensure git is installed and responsive; the double opt-in does not override an unavailable git",
        exitCode: 3,
      });
      return 3;
    }
    if (status.kind === "dirty" && !doubleOptIn) {
      printError({
        message: "--erase refused in a dirty git tree",
        remediation:
          "commit or stash changes, or pass --no-git-safety with SPECFORGE_ALLOW_DESTRUCTIVE=1 to override",
        exitCode: 3,
      });
      return 3;
    }
  }

  // Step 3: dry-run preview.
  const bundledFiles = await listBundledFrameworkFiles(opts.importMetaUrl);
  const bundleVer = await bundleVersion(opts.importMetaUrl);

  if (opts.dryRun) {
    info(opts, "dry-run: would perform the following operations:");
    if (opts.erase) {
      const targets = await listEraseTargets(opts.cwd);
      for (const t of targets) info(opts, `  delete  ${t}`);
    }
    for (const f of bundledFiles) info(opts, `  write   ${f}`);
    info(opts, `  write   SIBLINGS.md (team-data placeholder)`);
    info(opts, `  write   ROADMAP.md (team-data placeholder)`);
    info(opts, `  write   .specforge/manifest.json`);
    summary(opts, `dry-run: ${bundledFiles.length + 3} files would be written`);
    return 0;
  }

  // Step 4: acquire lock.
  let lock;
  try {
    lock = await acquireLock(opts.cwd, "init");
  } catch (e) {
    if (e instanceof LockHeldError) {
      printError({
        message: e.message,
        remediation:
          "wait for the other process to finish, or remove the lock manually if you confirm no process is running",
        exitCode: 5,
      });
      return 5;
    }
    throw e;
  }

  try {
    // Step 5: --erase deletions.
    if (opts.erase) {
      const targets = await listEraseTargets(opts.cwd);
      for (const t of targets) info(opts, `delete  ${t}`);
      for (const t of targets) {
        try {
          await fs.unlink(path.join(opts.cwd, t));
        } catch {
          // best effort
        }
      }
    }

    // Step 6: copy framework files.
    const frameworkEntries: FrameworkFileEntry[] = [];
    for (const rel of bundledFiles) {
      const src = bundleFileAbs(opts.importMetaUrl, rel);
      const bytes = await fs.readFile(src);
      await safeWriteFile(opts.cwd, rel, bytes);
      const sha = await sha256OfFile(path.join(opts.cwd, rel));
      frameworkEntries.push({ path: rel, sha256_at_install: sha });
      info(opts, `write   ${rel}`);
    }

    // Step 7: team-data placeholders. Only write SIBLINGS.md / ROADMAP.md
    // if they don't already exist — `--force` without `--erase` preserves
    // team data per § 5.1.
    const siblingsPath = path.join(opts.cwd, "SIBLINGS.md");
    try {
      await fs.access(siblingsPath);
    } catch {
      const placeholder = `# Sibling projects\n\n| Name | Path | Status | Read first |\n|---|---|---|---|\n`;
      await safeWriteFile(opts.cwd, "SIBLINGS.md", placeholder);
      info(opts, `write   SIBLINGS.md`);
    }
    const roadmapPath = path.join(opts.cwd, "ROADMAP.md");
    try {
      await fs.access(roadmapPath);
    } catch {
      const placeholder = `# Roadmap\n\n## Themes\n\n## Items\n`;
      await safeWriteFile(opts.cwd, "ROADMAP.md", placeholder);
      info(opts, `write   ROADMAP.md`);
    }

    // Step 8: manifest.
    const manifest = buildManifest({
      framework_version: bundleVer,
      framework_files: frameworkEntries,
      now: new Date().toISOString(),
    });
    await writeManifest(opts.cwd, manifest);
    info(opts, `write   .specforge/manifest.json`);

    summary(opts, `init complete: framework v${bundleVer} installed (${frameworkEntries.length} framework files)`);
    info(opts, "next steps: edit SIBLINGS.md and ROADMAP.md, then `specforge doctor`, `specforge update`, `specforge --help`");
    return 0;
  } catch (e) {
    printError({
      message: `I/O error during init: ${e instanceof Error ? e.message : String(e)}`,
      remediation: "inspect the cwd and re-run with --dry-run to see the planned operations",
      exitCode: 10,
    });
    return 10;
  } finally {
    await lock.release();
  }
}

// Suppress unused-var warning for module-scope helpers used in tests.
void TRACKED_TEAM_DATA;
void manifestExists;
