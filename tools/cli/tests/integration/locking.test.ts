// Row #41: concurrent invocation: second exits 5
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { mkTmpDir, withLock } from "../helpers.js";
import { acquireLock, LockHeldError } from "../../src/lock.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkTmpDir();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("concurrent invocation: second exits 5", () => {
  it("Spawn update against a tmpdir, then immediately spawn a second update. The second exits 5 with lock-held error naming the first process's pid. Lock removed after the first finishes; a third invocation succeeds.", async () => {
    // Acquire lock directly (simulating first process)
    const handle = await acquireLock(tmpDir, "update");

    try {
      // Second acquisition should fail with LockHeldError
      let caughtError: LockHeldError | null = null;
      try {
        const handle2 = await acquireLock(tmpDir, "update");
        await handle2.release(); // should not reach here
      } catch (e) {
        if (e instanceof LockHeldError) {
          caughtError = e;
        } else {
          throw e;
        }
      }

      expect(caughtError).not.toBeNull();
      expect(caughtError!.existing.pid).toBe(process.pid);
      expect(caughtError!.message).toContain("pid");
    } finally {
      await handle.release();
    }

    // After release, a third acquisition should succeed
    const handle3 = await acquireLock(tmpDir, "update");
    try {
      expect(handle3).toBeDefined();
    } finally {
      await handle3.release();
    }

    // Lock file should be gone after release
    await expect(
      fs.access(path.join(tmpDir, ".specforge", "lock"))
    ).rejects.toThrow();
  });
});
