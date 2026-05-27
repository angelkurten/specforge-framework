// Rows #23 and #42: path traversal and symlink security tests
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { mkTmpDir } from "../helpers.js";
import {
  lexicalResolve,
  safeWriteFile,
  PathTraversalError,
  SymlinkRefusedError,
} from "../../src/safe-fs.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkTmpDir();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("path traversal rejected", () => {
  it("A partition entry containing ../../etc/foo is rejected by safe-fs before any write (lexical guard)", async () => {
    await expect(safeWriteFile(tmpDir, "../../etc/foo", "malicious"))
      .rejects.toThrow(PathTraversalError);
  });

  it("An absolute path is rejected by the lexical guard", async () => {
    await expect(safeWriteFile(tmpDir, "/etc/passwd", "malicious"))
      .rejects.toThrow(PathTraversalError);
  });

  it("lexicalResolve throws on path traversal with '..'", () => {
    expect(() => lexicalResolve(tmpDir, "../../etc/foo")).toThrow(PathTraversalError);
  });

  it("lexicalResolve throws on absolute path input", () => {
    expect(() => lexicalResolve(tmpDir, "/etc/passwd")).toThrow(PathTraversalError);
  });
});

describe("path traversal: symlink at target rejected", () => {
  it("Plant a symlink at a target file path before write; CLI refuses to write through the symlink", async function () {
    if (process.platform === "win32") return; // skip on Windows

    const targetDir = path.join(tmpDir, "target-dir");
    await fs.mkdir(targetDir, { recursive: true });

    const sentinelPath = path.join(tmpDir, "sentinel.txt");
    await fs.writeFile(sentinelPath, "original sentinel");

    // Plant symlink at target pointing to sentinel
    const symlinkTarget = path.join(targetDir, "symlinked-file.md");
    await fs.symlink(sentinelPath, symlinkTarget);

    // Attempt to write through the symlink via safe-fs
    await expect(safeWriteFile(tmpDir, "target-dir/symlinked-file.md", "attacker content"))
      .rejects.toThrow(SymlinkRefusedError);

    // Sentinel must be untouched
    const sentinelContent = await fs.readFile(sentinelPath, "utf8");
    expect(sentinelContent).toBe("original sentinel");
  });

  it("Symlink at an intermediate directory is caught by real-path check", async function () {
    if (process.platform === "win32") return; // skip on Windows

    const outsideDir = await mkTmpDir();
    try {
      // Plant a symlink at an intermediate directory
      const symlinkDir = path.join(tmpDir, "malicious-dir");
      await fs.symlink(outsideDir, symlinkDir);

      // Try to write inside the symlinked directory
      // safeResolve should detect the symlink escape via realpath
      await expect(safeWriteFile(tmpDir, "malicious-dir/file.txt", "content"))
        .rejects.toThrow(); // PathTraversalError or SymlinkRefusedError
    } finally {
      await fs.rm(outsideDir, { recursive: true, force: true });
    }
  });
});
