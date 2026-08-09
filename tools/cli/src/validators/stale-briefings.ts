// PRD-006 § 5.4: stale-briefings.
//
// The 12 briefings moved from `agents/*.md` to `.claude/agents/specforge/*.md`
// in framework 0.11.0. `update` has no deletion path, so an existing install
// keeps the old copies on disk — and those copies are LLM-readable dispatch
// instructions, not inert metadata: an agent grounding in the repo can find
// and follow a briefing that contradicts the shipped definition. They also
// lose sha256 coverage the moment their manifest entries drop out, so
// `framework-file-integrity` no longer reports edits to them (PRD-006 § 8).
//
// Warning severity: it does not change `doctor`'s exit code, so CI gated on
// `doctor` will not fail on it. The finding text is the mitigation.

import { promises as fs } from "node:fs";
import * as path from "node:path";

import type { Finding, Validator } from "./types.js";

export const id = "stale-briefings";

/** The stale layout: reviewer briefings and roadmap panel briefings. */
const STALE_RE = /^(?:.*-reviewer|roadmap-.*)\.md$/;

const STALE_DIR = "agents";
const LIVE_DIR = ".claude/agents/specforge";

async function isDirectory(abs: string): Promise<boolean> {
  try {
    return (await fs.stat(abs)).isDirectory();
  } catch {
    return false;
  }
}

export const validator: Validator = {
  id,
  async run(cwd: string): Promise<Finding[]> {
    // Both halves of the condition must hold: a stale `agents/` directory on
    // its own belongs to a team that never updated (or never used specforge's
    // panels), and nothing about it is stale until the new tree is present.
    if (!(await isDirectory(path.join(cwd, LIVE_DIR)))) return [];

    let entries;
    try {
      entries = await fs.readdir(path.join(cwd, STALE_DIR), {
        withFileTypes: true,
      });
    } catch {
      return [];
    }

    const stale = entries
      .filter((e) => e.isFile() && STALE_RE.test(e.name))
      .map((e) => `${STALE_DIR}/${e.name}`)
      .sort();
    if (stale.length === 0) return [];

    // One finding, not one per file: the remedy is a single directory
    // deletion, and twelve copies of it would bury the other findings. The
    // sample is capped for the same reason — the finding names the directory,
    // not an inventory.
    const sample =
      stale.length > 3
        ? `${stale.slice(0, 3).join(", ")}, and ${stale.length - 3} more`
        : stale.join(", ");
    return [
      {
        rule: id,
        severity: "warning",
        file: `${STALE_DIR}/`,
        message:
          `stale briefings in \`${STALE_DIR}/\` coexist with \`${LIVE_DIR}/\` ` +
          `(${sample}). The briefings became subagent definitions in ` +
          `framework 0.11.0; the old copies are still readable dispatch ` +
          `instructions and are no longer sha256-tracked. Delete \`${STALE_DIR}/\` ` +
          `per the 0.11.0 release notes ("stale briefings cleanup").`,
      },
    ];
  },
};

export const run = validator.run;
