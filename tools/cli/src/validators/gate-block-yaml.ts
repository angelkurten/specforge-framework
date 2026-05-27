// PRD-003 § 7.4: gate-block-yaml.
// Every PRD's gate block parses as YAML (via the safe wrapper) with the
// three required fields. `tests` and `system_artifact_diff` are YAML lists.
// Implemented PRDs may not contain `[TBD]` values.

import { promises as fs } from "node:fs";
import * as path from "node:path";

import { parseYaml, UnsafeYamlError } from "../yaml.js";
import type { Finding, Validator } from "./types.js";

export const id = "gate-block-yaml";

const PRD_FILE_RE = /^(\d{3})-[a-z0-9][a-z0-9-]*\.md$/;
const STATUS_RE = /^\*\*Status\*\*:\s*(\S+)/m;
const GATE_FENCE_RE = /^##\s+Gate:[^\n]*\n+```yaml\n([\s\S]*?)\n```/m;

function containsTbd(value: unknown): boolean {
  if (typeof value === "string") return value.trim() === "[TBD]";
  if (Array.isArray(value)) return value.some(containsTbd);
  return false;
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
      if (!PRD_FILE_RE.test(e.name)) continue;
      const text = await fs.readFile(path.join(cwd, e.name), "utf8");
      const statusMatch = STATUS_RE.exec(text);
      const status = statusMatch?.[1]?.trim();
      const gate = GATE_FENCE_RE.exec(text);
      if (!gate) {
        findings.push({
          rule: id,
          severity: "error",
          file: e.name,
          message: "missing YAML gate block",
        });
        continue;
      }

      let parsed: any;
      try {
        parsed = parseYaml(gate[1]!);
      } catch (err) {
        const msg =
          err instanceof UnsafeYamlError
            ? err.message
            : err instanceof Error
              ? err.message
              : String(err);
        findings.push({
          rule: id,
          severity: "error",
          file: e.name,
          message: `gate block YAML parse failed: ${msg}`,
        });
        continue;
      }
      if (parsed === null || typeof parsed !== "object") {
        findings.push({
          rule: id,
          severity: "error",
          file: e.name,
          message: "gate block is not a mapping",
        });
        continue;
      }

      const required = ["commit_hash", "tests", "system_artifact_diff"] as const;
      for (const field of required) {
        if (!(field in parsed)) {
          findings.push({
            rule: id,
            severity: "error",
            file: e.name,
            message: `gate block missing required field: ${field}`,
          });
        }
      }

      if ("tests" in parsed && !Array.isArray(parsed.tests)) {
        findings.push({
          rule: id,
          severity: "error",
          file: e.name,
          message: "gate block `tests` must be a YAML list, never a bare scalar",
        });
      }
      if (
        "system_artifact_diff" in parsed &&
        !Array.isArray(parsed.system_artifact_diff)
      ) {
        findings.push({
          rule: id,
          severity: "error",
          file: e.name,
          message: "gate block `system_artifact_diff` must be a YAML list",
        });
      }

      if (status === "Implemented") {
        for (const field of required) {
          if (field in parsed && containsTbd(parsed[field])) {
            findings.push({
              rule: id,
              severity: "error",
              file: e.name,
              message: `Implemented PRD has [TBD] in gate field: ${field}`,
            });
          }
        }
      }
    }
    return findings;
  },
};

export const run = validator.run;
