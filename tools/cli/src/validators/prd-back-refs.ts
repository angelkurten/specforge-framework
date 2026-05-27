// PRD-003 § 7.4: prd-back-refs.
// Hard rule 4: no `> **Updated by PRD-X**` lines in any PRD.

import { promises as fs } from "node:fs";
import * as path from "node:path";

import type { Finding, Validator } from "./types.js";

export const id = "prd-back-refs";

const PRD_FILE_RE = /^(\d{3})-[a-z0-9][a-z0-9-]*\.md$/;
const BACK_REF_RE = /^>\s+\*\*Updated by PRD-\d+\*\*/m;

export const validator: Validator = {
  id,
  async run(cwd: string): Promise<Finding[]> {
    const findings: Finding[] = [];
    let entries;
    try {
      entries = await fs.readdir(cwd, { withFileTypes: true });
    } catch {
      return findings;
    }
    for (const e of entries) {
      if (!e.isFile()) continue;
      if (!PRD_FILE_RE.test(e.name)) continue;
      const text = await fs.readFile(path.join(cwd, e.name), "utf8");
      const lines = text.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (BACK_REF_RE.test(lines[i]!)) {
          findings.push({
            rule: id,
            severity: "error",
            file: e.name,
            line: i + 1,
            message: "forbidden `> **Updated by PRD-X**` back-reference (hard rule 4)",
          });
        }
      }
    }
    return findings;
  },
};

export const run = validator.run;
