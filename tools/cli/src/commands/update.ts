// `specforge update` — PRD-003 § 5.2, § 4.2.

import { constants as fsConstants, promises as fs } from "node:fs";
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
import { isRetired, isTeamData } from "../partition.js";
import { lexicalResolve, safeUnlink, safeWriteFile } from "../safe-fs.js";
import { sha256OfBytes, sha256OfFile } from "../sha.js";
import { info, printError, summary } from "../output.js";

// Printed paths are untrusted: escape backslash, C0/DEL/C1 controls and bidi/zero-width characters.
const esc = (p: string): string =>
  p.replace(/[\\\u0000-\u001f\u007f-\u009f]/g, (ch) => `\\x${ch.charCodeAt(0).toString(16).padStart(2, "0")}`)
    .replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, (ch) => `\\u{${ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0")}}`);

export interface UpdateOptions {
  cwd: string;
  strategy: "ours" | "theirs" | "merge" | null;
  dryRun: boolean;
  quiet: boolean;
  importMetaUrl: string;
  /** Globs declared retired; defaults to RETIRED_FILES. */
  retired?: ReadonlyArray<string>;
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

type Retired =
  | { kind: "gone" }
  | { kind: "kept"; reason: string }
  | { kind: "error"; code: string | undefined }
  | { kind: "file"; sha: string };

/** Classify a retired path before any write; a link is never followed. */
async function classifyRetired(
  cwd: string,
  rel: string,
  ids: ReadonlyMap<string, string>,
): Promise<Retired> {
  const abs = path.join(cwd, rel);
  // Lexical check first, no I/O: a path that leaves the repository is never read.
  try {
    if (rel.split(/[\\/]/).includes("..")) throw new Error("dot-dot segment");
    lexicalResolve(cwd, rel);
  } catch {
    return { kind: "kept", reason: "outside the repository; not read" };
  }
  try {
    // Walk the ancestors first: a linked directory means the path is not ours to touch.
    const parts = path.normalize(rel).split(path.sep).slice(0, -1);
    for (let i = 1; i <= parts.length; i++) {
      const dir = await fs.lstat(path.join(cwd, ...parts.slice(0, i)));
      if (dir.isSymbolicLink()) return { kind: "kept", reason: "symlink in path; not followed" };
    }
    const st = await fs.lstat(abs, { bigint: true });
    if (st.isSymbolicLink()) return { kind: "kept", reason: "symlink; not followed" };
    const twin = ids.get(`${st.dev}:${st.ino}`);
    if (twin !== undefined) return { kind: "kept", reason: `same file as ${esc(twin)}` };
    // O_NONBLOCK so a FIFO cannot hang the open; fstat the handle before reading.
    const fh = await fs.open(abs, fsConstants.O_RDONLY | fsConstants.O_NONBLOCK);
    try {
      const h = await fh.stat();
      if (h.isDirectory()) return { kind: "error", code: "EISDIR" };
      if (!h.isFile()) return { kind: "kept", reason: "not a regular file; not read" };
      return { kind: "file", sha: sha256OfBytes(await fh.readFile()) };
    } finally {
      await fh.close();
    }
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    return code === "ENOENT" || code === "ENOTDIR" ? { kind: "gone" } : { kind: "error", code };
  }
}

/** dev:ino of every bundle path that exists on disk, taken before any write. */
async function bundleIds(cwd: string, rels: Iterable<string>): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const rel of rels) {
    try {
      const st = await fs.stat(path.join(cwd, rel), { bigint: true });
      ids.set(`${st.dev}:${st.ino}`, rel);
    } catch {
      // not on disk: nothing to alias
    }
  }
  return ids;
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

  const retiredRels = [...installed.keys()].filter(
    (rel) => !bundleHashes.has(rel) && isRetired(rel, opts.retired) && !isTeamData(rel),
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
  // `merge` needs three inputs and this manifest stores two. PRD-003 § 6.1
  // records `sha256_at_install`, never the installed bytes, so there is no base
  // to diff against — and passing the bundle as base makes base === theirs,
  // which diff3 reads as "theirs changed nothing" and answers with `ours`,
  // byte for byte, every time. It then wrote the new `framework_version` to the
  // manifest, leaving a corpus that reports a version whose rules it does not
  // carry. Refusing is the honest answer until the base is stored.
  if (drifted.length > 0 && opts.strategy === "merge") {
    printError({
      message:
        "--strategy=merge cannot run: the installed bytes are not recorded, " +
        "so there is no base to merge against",
      remediation:
        "use --strategy=theirs and re-apply the local change, --strategy=ours " +
        "to keep it and take the rest, or upstream the local change so the " +
        "file stops drifting",
      exitCode: 1,
    });
    return 1;
  }

  if (opts.dryRun) {
    info(opts, "dry-run: would perform the following operations:");
    for (const u of toUpdate) info(opts, `  write   ${u.rel}`);
    for (const d of drifted) info(opts, `  ${opts.strategy ?? "drift-halt"}  ${d.rel}`);
    let dryRemoved = 0;
    let dryKept = 0;
    const ids = await bundleIds(opts.cwd, bundleHashes.keys());
    for (const rel of retiredRels) {
      const c = await classifyRetired(opts.cwd, rel, ids);
      if (c.kind === "gone") continue;
      if (c.kind === "error") {
        summary(opts, `  error   ${esc(rel)} (${c.code})`);
        continue;
      }
      if (c.kind === "kept") {
        summary(opts, `  kept    ${esc(rel)} (${c.reason})`);
        dryKept++;
        continue;
      }
      const sha = c.sha;
      const untouched = sha === installed.get(rel);
      if (untouched) dryRemoved++;
      else dryKept++;
      if (untouched) info(opts, `  remove  ${esc(rel)}`);
      else summary(opts, `  kept    ${esc(rel)} (edited; retired from the framework, no longer tracked)`);
    }
    summary(opts, `dry-run: ${toUpdate.length} updates, ${drifted.length} drifted (strategy: ${opts.strategy ?? "halt"}), ${dryRemoved} retired removed, ${dryKept} retired kept`);
    return 0;
  }

  if (drifted.length > 0 && !opts.strategy) {
    summary(opts, `drift detected on ${drifted.length} framework file(s):`);
    for (const d of drifted) summary(opts, `  drift  ${d.rel}`);
    printError({
      message: `${drifted.length} framework file(s) carry local modifications`,
      remediation: "pass --strategy=ours or --strategy=theirs to resolve",
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

  try {
    // Classify every retired path before the first write, so a read error
    // leaves the install exactly as the next run expects to find it.
    const retiredPlan = new Map<string, Retired>();
    const ids = await bundleIds(opts.cwd, bundleHashes.keys());
    for (const rel of retiredRels) {
      const c = await classifyRetired(opts.cwd, rel, ids);
      if (c.kind === "error") {
        printError({
          message: `cannot read retired file ${esc(rel)} (${c.code})`,
          remediation: `fix or remove ${esc(rel)}, then re-run \`specforge update\`; nothing was written`,
          exitCode: 10,
        });
        return 10;
      }
      retiredPlan.set(rel, c);
    }

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
    }

    // Remove untouched retired files, then their emptied parent directories.
    let retiredRemoved = 0;
    let retiredKept = 0;
    for (const rel of retiredRels) {
      const c = retiredPlan.get(rel)!;
      if (c.kind === "gone") continue;
      if (c.kind === "kept") {
        summary(opts, `kept    ${esc(rel)} (${c.reason})`);
        retiredKept++;
        continue;
      }
      if (c.kind !== "file") continue;
      const sha = c.sha;
      if (sha !== installed.get(rel)) {
        summary(opts, `kept    ${esc(rel)} (edited; retired from the framework, no longer tracked)`);
        retiredKept++;
        continue;
      }
      // Re-check just before the unlink; nothing here is fatal.
      const again = await classifyRetired(opts.cwd, rel, ids);
      if (again.kind === "gone") continue;
      if (again.kind !== "file" || again.sha !== sha) {
        const why =
          again.kind === "kept"
            ? again.reason
            : again.kind === "error"
              ? (again.code ?? "error")
              : "edited; retired from the framework, no longer tracked";
        summary(opts, `kept    ${esc(rel)} (${why})`);
        retiredKept++;
        continue;
      }
      try {
        await safeUnlink(opts.cwd, rel);
      } catch (e) {
        summary(opts, `kept    ${esc(rel)} (${(e as NodeJS.ErrnoException).code ?? "error"})`);
        retiredKept++;
        continue;
      }
      info(opts, `remove  ${esc(rel)}`);
      retiredRemoved++;
      for (let dir = path.dirname(rel); dir !== "."; dir = path.dirname(dir)) {
        try {
          await fs.rmdir(path.join(opts.cwd, dir)); // fails if non-empty
        } catch {
          break;
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


    summary(opts, `update complete: ${toUpdate.length} files refreshed, ${drifted.length} drifted (strategy: ${opts.strategy ?? "none"}), ${retiredRemoved} retired removed, ${retiredKept} retired kept`);
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
