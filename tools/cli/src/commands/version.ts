// `specforge version` — PRD-003 § 5.5.

import { bundleVersion } from "../framework-bundle.js";
import { manifestExists, readManifest, ManifestError } from "../manifest.js";
import { printError, writeJson } from "../output.js";

export interface VersionOptions {
  cwd: string;
  json: boolean;
  importMetaUrl: string;
}

export async function runVersion(opts: VersionOptions): Promise<number> {
  const bundled = await bundleVersion(opts.importMetaUrl).catch(() => "unknown");
  let installed: string | null = null;
  if (await manifestExists(opts.cwd)) {
    try {
      const m = await readManifest(opts.cwd);
      installed = m.framework_version;
    } catch (e) {
      if (e instanceof ManifestError) {
        printError({
          message: `manifest at .specforge/manifest.json is malformed (${e.message})`,
          remediation:
            "run `specforge init --force` to regenerate, or restore from version control",
          exitCode: 10,
        });
        return 10;
      }
      throw e;
    }
  }

  if (opts.json) {
    writeJson({
      schema_version: "1",
      bundled,
      installed,
      drift: installed !== null && installed !== bundled,
    });
  } else {
    process.stdout.write(`bundled framework version: ${bundled}\n`);
    if (installed === null) {
      process.stdout.write(`installed framework version: (no manifest)\n`);
    } else {
      process.stdout.write(`installed framework version: ${installed}\n`);
    }
  }
  return 0;
}
