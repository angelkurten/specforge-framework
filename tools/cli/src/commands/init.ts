// `specforge init`.

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
import { safeUnlink, safeWriteFile } from "../safe-fs.js";
import { sha256OfFile } from "../sha.js";
import { info, printError, summary } from "../output.js";
import { SETTINGS_SNIPPET } from "../lock-guard.js";

export interface InitOptions {
  cwd: string;
  force: boolean;
  erase: boolean;
  noGitSafety: boolean;
  dryRun: boolean;
  quiet: boolean;
  importMetaUrl: string;
}

// lstat, not access: any entry counts, a dangling symlink included, so init
// never writes through or over something already at a path it would ship.
async function cwdHasSpecforgeArtifacts(cwd: string, bundledFiles: string[]): Promise<boolean> {
  for (const p of [".specforge", "CLAUDE.md", ".claude/rules", ...bundledFiles]) {
    try {
      await fs.lstat(path.join(cwd, p));
      return true;
    } catch {
      // continue
    }
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
    if (await cwdHasSpecforgeArtifacts(opts.cwd, await listBundledFrameworkFiles(opts.importMetaUrl))) {
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
    info(opts, `  write   .specforge/manifest.json`);
    summary(opts, `dry-run: ${bundledFiles.length + 1} files would be written`);
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

  // Count refused erase targets so the summary can carry a printed warning.
  // The exit code stays 0: the frozen exit-code table maps 0 to "Install
  // completed" and 10 to "I/O error during copy", the refusal happens in the
  // erase phase (step 5) BEFORE any copy (step 6), and the install itself runs
  // to completion — PRD-006 § 5 opens with "No new CLI command, flag, or exit
  // code." What § 10 step 2 / § 9 row 30 require is that the refusal be
  // *printed* and the erase *continue*; the catch below does both, and a
  // printed warning on exit 0 satisfies it. Returning a non-zero code on a
  // completed install would change the CLI's exit-code contract — do NOT
  // implement it here.
  let eraseRefusals = 0;

  try {
    // Step 5: --erase deletions.
    if (opts.erase) {
      const targets = await listEraseTargets(opts.cwd);
      for (const t of targets) info(opts, `delete  ${t}`);
      for (const t of targets) {
        try {
          // `safeUnlink` adds safeResolve's lexical + realpath containment
          // check — the defence `safeReadFile` already documents against a
          // tampered partition entry, now that the erase set includes a
          // dot-directory (PRD-006 § 10 step 2). It signals refusal by
          // throwing, so the refusal must be surfaced: one that lands in an
          // empty catch is no defence at all.
          await safeUnlink(opts.cwd, t);
        } catch (e) {
          eraseRefusals++;
          printError({
            message: `could not delete ${t}: ${e instanceof Error ? e.message : String(e)}`,
            remediation:
              "remove the path manually, then re-run `specforge init --force --erase`",
          });
          // Continue: one refused target must not abandon the rest of the
          // erase, and the printed error is what makes the refusal visible.
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

    // Step 7: manifest.
    const manifest = buildManifest({
      framework_version: bundleVer,
      framework_files: frameworkEntries,
      now: new Date().toISOString(),
    });
    await writeManifest(opts.cwd, manifest);
    info(opts, `write   .specforge/manifest.json`);

    summary(opts, `init complete: framework v${bundleVer} installed (${frameworkEntries.length} framework files)`);
    info(opts, "next steps: run `specforge doctor`, then start a change with `/specforge-classify`");
    // Settings are team data: never written, so the v2 lock guard's
    // registration is printed for the team to paste.
    summary(
      opts,
      `to enable the v2 lock guard, add this to .claude/settings.json (init never writes it):\n${SETTINGS_SNIPPET}`,
    );
    if (eraseRefusals > 0) {
      // The framework install completed; the refused targets were already
      // printed one-by-one in the erase loop. Surface a summary warning too,
      // but keep the exit code at 0 — the install succeeded (see the counter's
      // declaration for the exit-code rationale).
      summary(
        opts,
        `warning: ${eraseRefusals} erase target(s) could not be deleted (see errors above)`,
      );
    }
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
void manifestExists;
