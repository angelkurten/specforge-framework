// PRD-003 § 7.4: prd-numbering.
// PRD filenames are monotonic 3-digit; no duplicates; non-three-digit
// names rejected.

import { promises as fs } from "node:fs";
import type { Finding, Validator } from "./types.js";

export const id = "prd-numbering";

const PRD_RE = /^(\d{3})-[a-z0-9][a-z0-9-]*\.md$/;
const BAD_RE = /^(\d+)-[^.]+\.md$/; // catches 1-foo.md, 0001-foo.md, etc.

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

    const seen = new Map<string, string>();
    const numbers: number[] = [];

    for (const e of entries) {
      if (!e.isFile()) continue;
      const name = e.name;
      const m = PRD_RE.exec(name);
      if (m) {
        const num = m[1]!;
        if (seen.has(num)) {
          findings.push({
            rule: id,
            severity: "error",
            file: name,
            message: `duplicate PRD number ${num} (also ${seen.get(num)})`,
          });
        } else {
          seen.set(num, name);
          numbers.push(parseInt(num, 10));
        }
      } else if (BAD_RE.test(name) && !/^ADR-/i.test(name) && !/^AgDR-/i.test(name)) {
        findings.push({
          rule: id,
          severity: "error",
          file: name,
          message: "PRD filename must be 3-digit zero-padded",
        });
      }
    }

    numbers.sort((a, b) => a - b);
    for (let i = 1; i < numbers.length; i++) {
      const a = numbers[i - 1]!;
      const b = numbers[i]!;
      if (b !== a + 1) {
        findings.push({
          rule: id,
          severity: "warning",
          message: `non-monotonic PRD numbering: gap between ${a} and ${b}`,
        });
      }
    }

    return findings;
  },
};

export const run = validator.run;
