// PRD-003 § 7.4: claude-md-size.
// CLAUDE.md ≤ 80 lines (soft target 50).

import { promises as fs } from "node:fs";
import * as path from "node:path";

import type { Finding, Validator } from "./types.js";

export const id = "claude-md-size";
const HARD_LIMIT = 80;
const SOFT_LIMIT = 50;

export const validator: Validator = {
  id,
  async run(cwd: string): Promise<Finding[]> {
    const findings: Finding[] = [];
    let text: string;
    try {
      text = await fs.readFile(path.join(cwd, "CLAUDE.md"), "utf8");
    } catch {
      // Absence of CLAUDE.md is caught by other validators (or doctor's
      // unknown-path layer). Don't double-report here.
      return findings;
    }
    const lines = text.split("\n");
    // Drop a single trailing empty line from the count.
    const lineCount = lines[lines.length - 1] === "" ? lines.length - 1 : lines.length;
    if (lineCount > HARD_LIMIT) {
      findings.push({
        rule: id,
        severity: "error",
        file: "CLAUDE.md",
        message: `CLAUDE.md is ${lineCount} lines (hard limit ${HARD_LIMIT})`,
      });
    } else if (lineCount > SOFT_LIMIT) {
      findings.push({
        rule: id,
        severity: "warning",
        file: "CLAUDE.md",
        message: `CLAUDE.md is ${lineCount} lines (soft target ${SOFT_LIMIT})`,
      });
    }
    return findings;
  },
};

export const run = validator.run;
