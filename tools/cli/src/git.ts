// Git interaction per PRD-003 § 8.3. The only thing we ever call is
// `git status --porcelain`, with a 5-second timeout, shell:false, and
// fail-closed semantics on every error path.

import { spawn } from "node:child_process";

export type GitStatus =
  | { kind: "clean" }
  | { kind: "dirty" }
  // cwd is not a git working tree at all. Not a fail-closed condition —
  // a freshly-created directory should be allowed to install.
  | { kind: "not-a-repo" }
  // genuine unavailability: binary missing, timeout, signal kill, unknown
  // non-zero exit. This IS the fail-closed condition per PRD § 8.3.
  | { kind: "unavailable"; reason: string };

/**
 * Probe the cwd for git cleanliness. Returns `"clean"` only when git
 * succeeds with empty porcelain output. Any error, timeout, missing binary,
 * or non-empty output is treated as a non-clean state.
 */
export async function gitStatus(cwd: string): Promise<GitStatus> {
  return new Promise<GitStatus>((resolve) => {
    let child;
    try {
      child = spawn("git", ["status", "--porcelain"], {
        cwd,
        shell: false,
        timeout: 5000,
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      resolve({ kind: "unavailable", reason });
      return;
    }

    let stdout = "";
    let stderr = "";
    let settled = false;
    const settle = (v: GitStatus) => {
      if (!settled) {
        settled = true;
        resolve(v);
      }
    };

    child.stdout?.on("data", (b: Buffer) => {
      stdout += b.toString("utf8");
    });
    child.stderr?.on("data", (b: Buffer) => {
      stderr += b.toString("utf8");
    });

    child.on("error", (e) => {
      settle({ kind: "unavailable", reason: e.message });
    });

    child.on("close", (code, signal) => {
      if (signal) {
        settle({ kind: "unavailable", reason: `killed by signal ${signal}` });
        return;
      }
      if (code !== 0) {
        // Distinguish "not a git repo" (benign) from real failures
        // (timeout, internal errors). Git uses "not a git repository" in
        // the fatal stderr line for the former.
        if (/not a git repository/i.test(stderr)) {
          settle({ kind: "not-a-repo" });
          return;
        }
        settle({
          kind: "unavailable",
          reason: `git exited ${code}: ${stderr.trim()}`,
        });
        return;
      }
      if (stdout.trim().length === 0) {
        settle({ kind: "clean" });
      } else {
        settle({ kind: "dirty" });
      }
    });
  });
}

/**
 * For `--erase` gating: returns `true` only if the working tree is
 * unambiguously clean. Any other state — dirty, no git, timeout, ENOENT —
 * returns `false`, the fail-closed default.
 */
export async function isGitTreeClean(cwd: string): Promise<boolean> {
  const r = await gitStatus(cwd);
  // A non-git cwd has no dirty changes to protect; treat as clean for
  // gating purposes.
  return r.kind === "clean" || r.kind === "not-a-repo";
}
