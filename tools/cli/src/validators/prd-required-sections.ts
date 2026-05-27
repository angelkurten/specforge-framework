// PRD-003 § 7.4: prd-required-sections.
// Every PRD has the Impacted Projects table + the 11 numbered sections +
// the gate block.

import { promises as fs } from "node:fs";
import * as path from "node:path";

import type { Finding, Validator } from "./types.js";

export const id = "prd-required-sections";

const PRD_FILE_RE = /^(\d{3})-[a-z0-9][a-z0-9-]*\.md$/;

const REQUIRED_SECTIONS: ReadonlyArray<{ heading: RegExp; label: string }> = [
  { heading: /^##\s+1\.?\s+Problem Statement/im, label: "§ 1 Problem Statement" },
  { heading: /^##\s+2\.?\s+Goals/im, label: "§ 2 Goals" },
  { heading: /^##\s+3\.?\s+Non-Goals/im, label: "§ 3 Non-Goals" },
  { heading: /^##\s+4\.?\s+User Flows/im, label: "§ 4 User Flows" },
  { heading: /^##\s+5\.?\s+API/im, label: "§ 5 API" },
  { heading: /^##\s+6\.?\s+Data Model/im, label: "§ 6 Data Model" },
  { heading: /^##\s+7\.?\s+Architecture/im, label: "§ 7 Architecture" },
  { heading: /^##\s+8\.?\s+Security/im, label: "§ 8 Security" },
  { heading: /^##\s+9\.?\s+Test Plan/im, label: "§ 9 Test Plan" },
  { heading: /^##\s+10\.?\s+Migration Plan/im, label: "§ 10 Migration Plan" },
  { heading: /^##\s+11\.?\s+Open Questions/im, label: "§ 11 Open Questions" },
];

const IMPACTED_PROJECTS_RE = /^##\s+Impacted Projects/im;
const GATE_BLOCK_RE = /^##\s+Gate:\s+Promotion to\s+`?Implemented`?/im;

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
      const abs = path.join(cwd, e.name);
      const text = await fs.readFile(abs, "utf8");

      if (!IMPACTED_PROJECTS_RE.test(text)) {
        findings.push({
          rule: id,
          severity: "error",
          file: e.name,
          message: "missing Impacted Projects table",
        });
      }
      for (const sec of REQUIRED_SECTIONS) {
        if (!sec.heading.test(text)) {
          findings.push({
            rule: id,
            severity: "error",
            file: e.name,
            message: `missing required section: ${sec.label}`,
          });
        }
      }
      if (!GATE_BLOCK_RE.test(text)) {
        findings.push({
          rule: id,
          severity: "error",
          file: e.name,
          message: "missing Gate: Promotion to Implemented block",
        });
      }
    }
    return findings;
  },
};

export const run = validator.run;
