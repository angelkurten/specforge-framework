// Safe filesystem primitives per PRD-003 § 8.4.
//
// All writes and deletes go through this module. It enforces:
//   1. Lexical path resolution — the resolved target must be a prefix of
//      the resolved cwd.
//   2. Real-path resolution — the realpath of the cwd and of the target's
//      parent directory must satisfy the same prefix invariant.
//   3. O_NOFOLLOW semantics on the leaf — open with 'wx' for new files,
//      lstat before any overwrite (refuse if the target is a symlink).

import { promises as fs } from "node:fs";
import * as path from "node:path";

export class PathTraversalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PathTraversalError";
  }
}

export class SymlinkRefusedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SymlinkRefusedError";
  }
}

async function realpathOrSelf(p: string): Promise<string> {
  try {
    return await fs.realpath(p);
  } catch {
    return p;
  }
}

/**
 * Resolve a path relative to cwd and assert it stays inside cwd.
 * Returns the lexically resolved absolute path.
 */
export function lexicalResolve(cwd: string, rel: string): string {
  if (path.isAbsolute(rel)) {
    throw new PathTraversalError(`refusing absolute path: ${rel}`);
  }
  const resolvedCwd = path.resolve(cwd);
  const resolvedTarget = path.resolve(resolvedCwd, rel);
  const relAfter = path.relative(resolvedCwd, resolvedTarget);
  if (relAfter.startsWith("..") || path.isAbsolute(relAfter)) {
    throw new PathTraversalError(`path escapes cwd: ${rel}`);
  }
  return resolvedTarget;
}

/**
 * Run the full § 8.4 check: lexical resolve, then realpath on cwd and on the
 * target's parent directory. Returns the resolved absolute path; throws on
 * any violation. If the parent directory does not yet exist, the deepest
 * existing ancestor is realpath-checked instead.
 */
export async function safeResolve(cwd: string, rel: string): Promise<string> {
  const resolvedTarget = lexicalResolve(cwd, rel);
  const realCwd = await realpathOrSelf(path.resolve(cwd));

  // Find the deepest ancestor of resolvedTarget that exists, realpath it,
  // then check that it stays inside realCwd.
  let probe = path.dirname(resolvedTarget);
  // Bound the loop — `path.dirname` of `/` is `/`.
  for (let i = 0; i < 4096; i++) {
    try {
      await fs.access(probe);
      break;
    } catch {
      const parent = path.dirname(probe);
      if (parent === probe) break;
      probe = parent;
    }
  }
  const realParent = await realpathOrSelf(probe);
  const relParent = path.relative(realCwd, realParent);
  if (relParent.startsWith("..") || path.isAbsolute(relParent)) {
    throw new PathTraversalError(
      `realpath escapes cwd: ${rel} (real parent ${realParent} not under ${realCwd})`,
    );
  }
  return resolvedTarget;
}

/**
 * Write a file safely. If the file already exists, refuses if it is a
 * symlink. Always opens with the `wx`-equivalent flag dance:
 *   - if the file does not exist: open with 'wx' (atomic create, fails if a
 *     symlink is in the path or if the file was raced into existence).
 *   - if the file exists: lstat to ensure it is a regular file, then
 *     truncate-and-write.
 */
export async function safeWriteFile(
  cwd: string,
  rel: string,
  contents: Buffer | string,
): Promise<void> {
  const abs = await safeResolve(cwd, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });

  let exists = false;
  try {
    const st = await fs.lstat(abs);
    if (st.isSymbolicLink()) {
      throw new SymlinkRefusedError(
        `refusing to write through symlink at ${rel}`,
      );
    }
    if (!st.isFile()) {
      throw new SymlinkRefusedError(
        `refusing to overwrite non-file at ${rel}`,
      );
    }
    exists = true;
  } catch (e) {
    if (e instanceof SymlinkRefusedError) throw e;
    // ENOENT is fine — the file doesn't exist yet.
  }

  if (!exists) {
    const handle = await fs.open(abs, "wx");
    try {
      await handle.writeFile(contents);
    } finally {
      await handle.close();
    }
  } else {
    // Open existing file with 'r+' would race; safer to unlink + create.
    // First re-check that the path is still a regular file (TOCTOU narrow).
    const st = await fs.lstat(abs);
    if (st.isSymbolicLink()) {
      throw new SymlinkRefusedError(
        `refusing to write through symlink at ${rel}`,
      );
    }
    await fs.unlink(abs);
    const handle = await fs.open(abs, "wx");
    try {
      await handle.writeFile(contents);
    } finally {
      await handle.close();
    }
  }
}

/**
 * Delete a file safely. Refuses if the target is a symlink.
 */
export async function safeUnlink(cwd: string, rel: string): Promise<void> {
  const abs = await safeResolve(cwd, rel);
  try {
    const st = await fs.lstat(abs);
    if (st.isSymbolicLink()) {
      throw new SymlinkRefusedError(
        `refusing to unlink symlink at ${rel}`,
      );
    }
  } catch (e) {
    if (e instanceof SymlinkRefusedError) throw e;
    // ENOENT — already gone.
    return;
  }
  await fs.unlink(abs);
}

/**
 * Read a file. The read path is also subject to the safe-resolve guard, so
 * a partition entry that names `../../etc/passwd` is rejected at read time
 * too (defence in depth — the partition shouldn't contain such an entry,
 * but if a tampered package ships one, the read fails just like the write).
 */
export async function safeReadFile(
  cwd: string,
  rel: string,
): Promise<Buffer> {
  const abs = await safeResolve(cwd, rel);
  return fs.readFile(abs);
}
