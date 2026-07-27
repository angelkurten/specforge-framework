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

// Use vs. mention: hard rule 9 forbids *using* marketing language, not *naming*
// it. A phrase wrapped in quotes or backticks is being cited — which is what a
// PRD documenting this very rule has to do. PRD-003 § 7.4 and its § 9 test-plan
// row quote all five phrases and were flagged six times for it.
const QUOTE_CHARS = new Set(['"', "'", "`", "“", "”", "‘", "’"]);

function isQuoted(line: string, start: number, end: number): boolean {
  const before = line[start - 1];
  const after = line[end];
  return (
    before !== undefined &&
    after !== undefined &&
    QUOTE_CHARS.has(before) &&
    QUOTE_CHARS.has(after)
  );
}

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
        const line = lines[i]!;
        const lower = line.toLowerCase();
        for (const phrase of FORBIDDEN) {
          for (let at = lower.indexOf(phrase); at !== -1; at = lower.indexOf(phrase, at + 1)) {
            if (isQuoted(line, at, at + phrase.length)) continue;
            findings.push({
              rule: id,
              severity: "error",
              file: e.name,
              line: i + 1,
              message: `forbidden marketing phrase: "${phrase}"`,
            });
            break; // one finding per phrase per line
          }
        }
      }
    }
    return findings;
  },
};

export const run = validator.run;
