// `specforge doctor` — PRD-003 § 5.3, § 4.3.

import { bundleVersion, hashBundle } from "../framework-bundle.js";
import { manifestExists, readManifest } from "../manifest.js";
import {
  ALL_VALIDATORS,
  type Finding,
  findValidator,
  VALIDATOR_IDS,
} from "../validators/index.js";
import { printError, writeJson, info, summary } from "../output.js";

export interface DoctorOptions {
  cwd: string;
  json: boolean;
  rules: ReadonlyArray<string>;
  ignoreSiblings: ReadonlyArray<string>;
  quiet: boolean;
  importMetaUrl: string;
}

export async function runDoctor(opts: DoctorOptions): Promise<number> {
  // Validate --rule names up-front.
  for (const r of opts.rules) {
    if (!VALIDATOR_IDS.includes(r)) {
      printError({
        message: `unknown --rule value: ${r}`,
        remediation: `valid rules: ${VALIDATOR_IDS.join(", ")}`,
        exitCode: 2,
      });
      return 2;
    }
  }

  const toRun =
    opts.rules.length === 0
      ? ALL_VALIDATORS
      : opts.rules
          .map((r) => findValidator(r))
          .filter((v): v is NonNullable<typeof v> => v !== undefined);

  // Prepare framework-file-integrity inputs.
  let bundledFrameworkVersion: string | undefined;
  let bundleHashes: ReadonlyMap<string, string> | undefined;
  try {
    bundledFrameworkVersion = await bundleVersion(opts.importMetaUrl);
    bundleHashes = await hashBundle(opts.importMetaUrl);
  } catch {
    // No bundle available (e.g. running from source without the framework
    // tree populated). The integrity validator no-ops in that case.
  }

  const findings: Finding[] = [];
  const failedValidators = new Set<string>();
  const ranIds: string[] = [];

  for (const v of toRun) {
    ranIds.push(v.id);
    try {
      const out = await v.run(opts.cwd, {
        ignoreSiblings: opts.ignoreSiblings,
        bundleHashes,
        bundledFrameworkVersion,
      });
      for (const f of out) {
        findings.push(f);
        if (f.severity === "error") failedValidators.add(f.rule);
      }
      info(opts, `check   ${v.id} — ${out.filter((f) => f.severity === "error").length} error(s), ${out.filter((f) => f.severity === "warning").length} warning(s)`);
    } catch (e) {
      findings.push({
        rule: v.id,
        severity: "error",
        message: `validator threw: ${e instanceof Error ? e.message : String(e)}`,
      });
      failedValidators.add(v.id);
    }
  }

  // Compute installed_framework_version for the JSON output.
  let installed: string | null = null;
  if (await manifestExists(opts.cwd)) {
    try {
      const m = await readManifest(opts.cwd);
      installed = m.framework_version;
    } catch {
      installed = null;
    }
  }

  if (opts.json) {
    writeJson({
      schema_version: "1",
      bundled_framework_version: bundledFrameworkVersion ?? null,
      installed_framework_version: installed,
      validators_run: ranIds,
      exclusions: { siblings: [...opts.ignoreSiblings] },
      findings,
    });
  } else {
    for (const f of findings) {
      const loc = f.file ? ` ${f.file}${f.line ? `:${f.line}` : ""}` : "";
      process.stderr.write(
        `[${f.severity}] ${f.rule}${loc}: ${f.message}\n`,
      );
    }
    summary(opts, `doctor: ${failedValidators.size} validator(s) reported errors, ${findings.length} total finding(s)`);
  }

  return Math.min(failedValidators.size, 255);
}
