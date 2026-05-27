// `specforge update` — PRD-003 § 5.2, § 4.2.

import { promises as fs } from "node:fs";
import * as path from "node:path";

import {
  bundleFileAbs,
  bundleVersion,
  hashBundle,
} from "../framework-bundle.js";
import { acquireLock, LockHeldError } from "../lock.js";
import {
  buildManifest,
  type FrameworkFileEntry,
  manifestExists,
  readManifest,
  writeManifest,
} from "../manifest.js";
import { threeWayMerge } from "../merge.js";
import { safeWriteFile } from "../safe-fs.js";
import { sha256OfBytes, sha256OfFile } from "../sha.js";
import { info, printError, summary } from "../output.js";

export interface UpdateOptions {
  cwd: string;
  strategy: "ours" | "theirs" | "merge" | null;
  dryRun: boolean;
  quiet: boolean;
  importMetaUrl: string;
}

interface PerFileState {
  rel: string;
  installedSha: string | null;
  onDiskSha: string | null;
  bundledSha: string;
  state:
    | "unchanged-by-user-equal"
    | "unchanged-by-user-needs-update"
    | "changed-by-user"
    | "missing-locally";
}

async function compareAll(
  cwd: string,
  bundleHashes: ReadonlyMap<string, string>,
  installed: ReadonlyMap<string, string>,
): Promise<PerFileState[]> {
  const out: PerFileState[] = [];
  for (const [rel, bundledSha] of bundleHashes.entries()) {
    const installedSha = installed.get(rel) ?? null;
    const abs = path.join(cwd, rel);
    let onDiskSha: string | null = null;
    try {
      await fs.access(abs);
      onDiskSha = await sha256OfFile(abs);
    } catch {
      onDiskSha = null;
    }

    let state: PerFileState["state"];
    if (onDiskSha === null) state = "missing-locally";
    else if (installedSha === null) state = "changed-by-user";
    else if (onDiskSha === installedSha)
      state =
        installedSha === bundledSha
          ? "unchanged-by-user-equal"
          : "unchanged-by-user-needs-update";
    else state = "changed-by-user";

    out.push({ rel, installedSha, onDiskSha, bundledSha, state });
  }
  return out;
}

export async function runUpdate(opts: UpdateOptions): Promise<number> {
  if (!(await manifestExists(opts.cwd))) {
    printError({
      message: `no .specforge/manifest.json found at ${opts.cwd}`,
      remediation:
        "run `specforge init --force` (existing framework files are preserved if their sha256 matches the bundled version), or restore the manifest from version control",
      exitCode: 2,
    });
    return 2;
  }

  const manifest = await readManifest(opts.cwd);
  const bundleVer = await bundleVersion(opts.importMetaUrl);

  // Refuse if installed version is newer than bundled.
  if (compareSemver(manifest.framework_version, bundleVer) > 0) {
    printError({
      message: `installed framework_version ${manifest.framework_version} is newer than bundled ${bundleVer}`,
      remediation:
        "run `npx @angelkurten/specforge@latest update` to use a CLI that matches your install",
      exitCode: 2,
    });
    return 2;
  }

  const bundleHashes = await hashBundle(opts.importMetaUrl);
  const installed = new Map(
    manifest.framework_files.map((f) => [f.path, f.sha256_at_install] as const),
  );

  const states = await compareAll(opts.cwd, bundleHashes, installed);
  const drifted = states.filter((s) => s.state === "changed-by-user");
  const toUpdate = states.filter(
    (s) =>
      s.state === "unchanged-by-user-needs-update" ||
      s.state === "missing-locally",
  );

  // Dry-run is a pure preview — it must always exit 0 regardless of drift,
  // since the user is exactly asking "what would happen?" without committing.
  // The drift/no-strategy halt only applies to a write run.
  if (opts.dryRun) {
    info(opts, "dry-run: would perform the following operations:");
    for (const u of toUpdate) info(opts, `  write   ${u.rel}`);
    for (const d of drifted) info(opts, `  ${opts.strategy ?? "drift-halt"}  ${d.rel}`);
    summary(opts, `dry-run: ${toUpdate.length} updates, ${drifted.length} drifted (strategy: ${opts.strategy ?? "halt"})`);
    return 0;
  }

  if (drifted.length > 0 && !opts.strategy) {
    summary(opts, `drift detected on ${drifted.length} framework file(s):`);
    for (const d of drifted) summary(opts, `  drift  ${d.rel}`);
    printError({
      message: `${drifted.length} framework file(s) carry local modifications`,
      remediation:
        "pass --strategy=ours, --strategy=theirs, or --strategy=merge to resolve",
      exitCode: 1,
    });
    return 1;
  }

  let lock;
  try {
    lock = await acquireLock(opts.cwd, "update");
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

  let conflictedCount = 0;
  const conflictedPaths: string[] = [];

  try {
    // Update non-drifted files.
    for (const u of toUpdate) {
      const src = bundleFileAbs(opts.importMetaUrl, u.rel);
      const bytes = await fs.readFile(src);
      await safeWriteFile(opts.cwd, u.rel, bytes);
      info(opts, `write   ${u.rel}`);
    }

    // Apply strategy to drifted files.
    if (opts.strategy === "theirs") {
      for (const d of drifted) {
        const src = bundleFileAbs(opts.importMetaUrl, d.rel);
        const bytes = await fs.readFile(src);
        await safeWriteFile(opts.cwd, d.rel, bytes);
        info(opts, `theirs  ${d.rel}`);
      }
    } else if (opts.strategy === "ours") {
      for (const d of drifted) info(opts, `ours    ${d.rel} (preserved)`);
    } else if (opts.strategy === "merge") {
      for (const d of drifted) {
        const installedSha = d.installedSha;
        const baseBytes = installedSha
          ? // Best effort: we don't store the original bytes, only the hash.
            // Use the bundled file as `base` when we cannot recover the
            // installed-time bytes — this is a graceful degradation
            // documented as a future improvement.
            await fs.readFile(bundleFileAbs(opts.importMetaUrl, d.rel))
          : await fs.readFile(bundleFileAbs(opts.importMetaUrl, d.rel));
        const oursBytes = await fs.readFile(path.join(opts.cwd, d.rel));
        const theirsBytes = await fs.readFile(
          bundleFileAbs(opts.importMetaUrl, d.rel),
        );
        const merged = threeWayMerge(
          baseBytes.toString("utf8"),
          oursBytes.toString("utf8"),
          theirsBytes.toString("utf8"),
        );
        await safeWriteFile(opts.cwd, d.rel, merged.text);
        if (merged.conflicted) {
          conflictedCount += 1;
          conflictedPaths.push(d.rel);
          info(opts, `merge!  ${d.rel} (conflicts present)`);
        } else {
          info(opts, `merge   ${d.rel}`);
        }
      }
    }

    // Rebuild manifest.
    const newEntries: FrameworkFileEntry[] = [];
    for (const [rel] of bundleHashes.entries()) {
      const abs = path.join(opts.cwd, rel);
      try {
        const sha = await sha256OfFile(abs);
        newEntries.push({ path: rel, sha256_at_install: sha });
      } catch {
        // File still missing (e.g. user removed it during the update). Skip.
      }
    }
    const newManifest = buildManifest({
      framework_version: bundleVer,
      framework_files: newEntries,
      now: new Date().toISOString(),
      prior: manifest,
    });
    await writeManifest(opts.cwd, newManifest);

    if (conflictedCount > 0) {
      for (const p of conflictedPaths) process.stderr.write(`${p}\n`);
      printError({
        message: `${conflictedCount} file(s) contain unresolved <<<<<<< merge markers`,
        remediation:
          "resolve conflicts manually, then re-run `specforge update` (drift will be reconciled)",
        exitCode: 3,
      });
      return 3;
    }

    summary(opts, `update complete: ${toUpdate.length} files refreshed, ${drifted.length} drifted (strategy: ${opts.strategy ?? "none"})`);
    return 0;
  } catch (e) {
    printError({
      message: `I/O error during update: ${e instanceof Error ? e.message : String(e)}`,
      remediation: "inspect the cwd and re-run with --dry-run to see the planned operations",
      exitCode: 10,
    });
    return 10;
  } finally {
    await lock.release();
  }
}

function compareSemver(a: string, b: string): number {
  // Strip any pre-release suffix for comparison purposes — we treat
  // 0.7.0-rc.1 == 0.7.0 for the version-newer check; the exact rc cmp
  // would require full semver. The PRD's intent is to refuse mutating
  // against a *strictly* newer major/minor/patch.
  const stripped = (s: string) => s.replace(/[-+].*$/, "");
  const pa = stripped(a).split(".").map((n) => parseInt(n, 10));
  const pb = stripped(b).split(".").map((n) => parseInt(n, 10));
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

// Hash helper retained for potential extension.
void sha256OfBytes;
