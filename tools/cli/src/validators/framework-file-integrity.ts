// PRD-003 § 7.4: framework-file-integrity.
// When installed_framework_version == bundled_framework_version, every
// framework file's on-disk sha256 must match the bundled sha256.
// Otherwise no-op (update is the remedy).

import * as path from "node:path";
import { promises as fs } from "node:fs";

import { readManifest, manifestExists } from "../manifest.js";
import { sha256OfFile } from "../sha.js";
import type { Finding, Validator, ValidatorOptions } from "./types.js";

export const id = "framework-file-integrity";

export const validator: Validator = {
  id,
  async run(cwd: string, opts: ValidatorOptions = {}): Promise<Finding[]> {
    if (!(await manifestExists(cwd))) {
      return [];
    }
    if (!opts.bundleHashes || !opts.bundledFrameworkVersion) {
      return [];
    }
    const manifest = await readManifest(cwd);
    if (manifest.framework_version !== opts.bundledFrameworkVersion) {
      return [];
    }

    const findings: Finding[] = [];
    for (const [rel, bundledSha] of opts.bundleHashes.entries()) {
      const abs = path.join(cwd, rel);
      let onDisk: string;
      try {
        await fs.access(abs);
        onDisk = await sha256OfFile(abs);
      } catch {
        findings.push({
          rule: id,
          severity: "error",
          file: rel,
          message: "framework file missing on disk",
        });
        continue;
      }
      if (onDisk !== bundledSha) {
        findings.push({
          rule: id,
          severity: "error",
          file: rel,
          message: `sha256 drift against bundled framework (expected ${bundledSha.slice(0, 12)}…, got ${onDisk.slice(0, 12)}…)`,
        });
      }
    }
    return findings;
  },
};

export const run = validator.run;
