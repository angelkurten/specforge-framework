// changes/2026-10-23-init-installs-v2: lock-guard-registered.
// The guard script is installed but only runs once a settings file registers
// it. A warning, never an error: the loop's hash check works without it.

import { promises as fs } from "node:fs";
import * as path from "node:path";

import { GUARD_PATH } from "../lock-guard.js";
import type { Finding, Validator } from "./types.js";

export const id = "lock-guard-registered";
const SETTINGS = [".claude/settings.json", ".claude/settings.local.json"];
const GUARD_NAME = path.basename(GUARD_PATH);

export const validator: Validator = {
  id,
  async run(cwd: string): Promise<Finding[]> {
    try {
      await fs.access(path.join(cwd, GUARD_PATH));
    } catch {
      return [];
    }
    const findings: Finding[] = [];
    for (const rel of SETTINGS) {
      let text: string;
      try {
        text = await fs.readFile(path.join(cwd, rel), "utf8");
      } catch {
        continue;
      }
      let hooks: unknown;
      try {
        hooks = (JSON.parse(text) as { hooks?: unknown }).hooks;
      } catch {
        findings.push({
          rule: id,
          severity: "warning",
          file: rel,
          message: `${rel} is not valid JSON, so whether it registers ${GUARD_NAME} cannot be checked`,
        });
        continue;
      }
      if (JSON.stringify(hooks ?? null).includes(GUARD_NAME)) return [];
    }
    findings.push({
      rule: id,
      severity: "warning",
      file: GUARD_PATH,
      message: `${GUARD_NAME} is installed but no .claude/settings.json or settings.local.json registers it; paste the hook block \`specforge init\` prints`,
    });
    return findings;
  },
};

export const run = validator.run;
