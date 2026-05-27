// PRD-003 § 7.4: prd-marketing-language.
// Hard rule 9: forbidden marketing phrases, case-insensitive.

import { promises as fs } from "node:fs";
import * as path from "node:path";

import type { Finding, Validator } from "./types.js";

export const id = "prd-marketing-language";

const FORBIDDEN = [
  "blazingly fast",
  "enterprise-grade",
  "best-in-class",
  "robust",
  "seamless",
];

const TARGET_RE = /^(?:\d{3}-[a-z0-9][a-z0-9-]*|ADR-\d{3}-[a-z0-9][a-z0-9-]*)\.md$/;

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
      if (!TARGET_RE.test(e.name)) continue;
      const text = await fs.readFile(path.join(cwd, e.name), "utf8");
      const lines = text.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const lower = lines[i]!.toLowerCase();
        for (const phrase of FORBIDDEN) {
          if (lower.includes(phrase)) {
            findings.push({
              rule: id,
              severity: "error",
              file: e.name,
              line: i + 1,
              message: `forbidden marketing phrase: "${phrase}"`,
            });
          }
        }
      }
    }
    return findings;
  },
};

export const run = validator.run;
