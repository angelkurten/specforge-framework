// .specforge/lock acquisition per PRD-003 § 7.6.
//
// Mutating commands (init, update, migrate) acquire this lock; doctor and
// version do not. The file's presence IS the lock — fs.open with 'wx'
// gives the cross-platform exclusive-create guarantee we need.

import * as fsSync from "node:fs";
import { promises as fs } from "node:fs";
import * as path from "node:path";

export interface LockInfo {
  pid: number;
  command: "init" | "update" | "migrate";
  acquired_at: string;
}

export class LockHeldError extends Error {
  readonly existing: LockInfo;
  constructor(existing: LockInfo) {
    super(
      `another specforge process holds .specforge/lock (pid ${existing.pid}, acquired ${existing.acquired_at})`,
    );
    this.name = "LockHeldError";
    this.existing = existing;
  }
}

export interface LockHandle {
  release(): Promise<void>;
}

const LOCK_REL = ".specforge/lock";

function lockPath(cwd: string): string {
  return path.join(cwd, LOCK_REL);
}

async function readExistingLock(p: string): Promise<LockInfo> {
  const raw = await fs.readFile(p, "utf8");
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.pid === "number" &&
      typeof parsed.command === "string" &&
      typeof parsed.acquired_at === "string"
    ) {
      return parsed as LockInfo;
    }
  } catch {
    // fall through
  }
  return { pid: -1, command: "init", acquired_at: "unknown" };
}

/**
 * Acquire the lock. Throws LockHeldError if another process holds it.
 * Installs SIGINT/SIGTERM handlers that release the lock before exit.
 */
export async function acquireLock(
  cwd: string,
  command: LockInfo["command"],
): Promise<LockHandle> {
  const p = lockPath(cwd);
  await fs.mkdir(path.dirname(p), { recursive: true });

  const info: LockInfo = {
    pid: process.pid,
    command,
    acquired_at: new Date().toISOString(),
  };
  const body = JSON.stringify(info) + "\n";

  let handle;
  try {
    handle = await fs.open(p, "wx");
  } catch (e: any) {
    if (e && e.code === "EEXIST") {
      const existing = await readExistingLock(p);
      throw new LockHeldError(existing);
    }
    throw e;
  }
  try {
    await handle.writeFile(body);
  } finally {
    await handle.close();
  }

  let released = false;
  const release = async () => {
    if (released) return;
    released = true;
    try {
      // Only remove the lock if it still names our pid — defensive against
      // a manual recovery that happened in parallel.
      const raw = await fs.readFile(p, "utf8");
      const parsed = JSON.parse(raw) as LockInfo;
      if (parsed.pid === process.pid) {
        await fs.unlink(p);
      }
    } catch {
      // Best-effort. If the lock vanished or is unparseable, leave it.
    }
  };

  const signalHandler = (sig: NodeJS.Signals) => {
    // Fire-and-forget — we're on the way out.
    void release().finally(() => {
      // Re-raise the default behaviour by exiting non-zero.
      process.exit(130);
    });
    // Reference sig to avoid unused-var.
    void sig;
  };
  process.once("SIGINT", signalHandler);
  process.once("SIGTERM", signalHandler);

  const onExit = () => {
    // process.exit handlers must be synchronous; we do a best-effort sync
    // unlink here. Errors are swallowed.
    try {
      const raw = fsSync.readFileSync(p, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed && parsed.pid === process.pid) {
        fsSync.unlinkSync(p);
      }
    } catch {
      // ignore
    }
  };
  process.once("exit", onExit);

  return {
    release: async () => {
      process.removeListener("SIGINT", signalHandler);
      process.removeListener("SIGTERM", signalHandler);
      process.removeListener("exit", onExit);
      await release();
    },
  };
}
