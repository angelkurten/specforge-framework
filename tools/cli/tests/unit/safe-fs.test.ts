// PRD-006 § 9 row 30 (unit half): the erase loop's refusals are real.
//
// `listEraseTargets` drops symlink dirents (`isFile()` is false for a symlink,
// the same walk semantics § 5.4 pins), so a planted symlink never reaches the
// unlink call on the ordinary path — the TOCTOU window between collection and
// deletion is the only way there. That is exactly why the refusal is asserted
// directly against `safe-fs.ts` rather than through `init`.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";

import {
  PathTraversalError,
  safeUnlink,
  SymlinkRefusedError,
} from "../../src/safe-fs.js";
import { mkTmpDir } from "../helpers.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkTmpDir();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("safeUnlink", () => {
  it("refuses a symlink with SymlinkRefusedError, leaving link and target intact", async () => {
    if (process.platform === "win32") return;

    const target = path.join(tmpDir, "real.md");
    await fs.writeFile(target, "target content\n");
    const link = path.join(tmpDir, "link.md");
    await fs.symlink(target, link);

    await expect(safeUnlink(tmpDir, "link.md")).rejects.toThrow(
      SymlinkRefusedError,
    );
    // A refusal that deleted something would be worse than no refusal.
    expect(await fs.readFile(target, "utf8")).toBe("target content\n");
    expect((await fs.lstat(link)).isSymbolicLink()).toBe(true);
  });

  it("deletes a regular file", async () => {
    await fs.writeFile(path.join(tmpDir, "gone.md"), "x\n");
    await safeUnlink(tmpDir, "gone.md");
    await expect(fs.access(path.join(tmpDir, "gone.md"))).rejects.toThrow();
  });

  it("is a no-op on a path that does not exist", async () => {
    await expect(safeUnlink(tmpDir, "never-existed.md")).resolves.toBeUndefined();
  });

  it("refuses a path that escapes cwd", async () => {
    // The containment check is the reason the erase loop routes through
    // safeUnlink at all (§ 10 step 2): a tampered partition entry cannot
    // steer a delete outside the install tree.
    await expect(safeUnlink(tmpDir, "../outside.md")).rejects.toThrow(
      PathTraversalError,
    );
  });
});
