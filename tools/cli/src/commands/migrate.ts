// `specforge migrate` — PRD-003 § 5.4, § 4.4.

import { bundleVersion } from "../framework-bundle.js";
import { acquireLock, LockHeldError } from "../lock.js";
import {
  type MigrationAppliedEntry,
  manifestExists,
  readManifest,
  writeManifest,
} from "../manifest.js";
import {
  ALL_MIGRATIONS,
  type Migration,
  migrationScriptSha,
  planMigrations,
} from "../migrations-registry.js";
import { info, printError, summary, writeJson } from "../output.js";

export interface MigrateOptions {
  cwd: string;
  apply: boolean;
  to: string | null;
  allowDowngrade: boolean;
  acknowledgeSecurityRollback: boolean;
  json: boolean;
  dryRun: boolean;
  quiet: boolean;
  importMetaUrl: string;
  /**
   * Test-only injection: extra migrations appended to the bundled list.
   * Production callers (CLI dispatch) never set this — defaults to []. The
   * registry composes bundled + extra inside `runMigrate` only.
   */
  extraMigrations?: ReadonlyArray<Migration>;
}

function compareSemver(a: string, b: string): number {
  const stripped = (s: string) => s.replace(/[-+].*$/, "");
  const pa = stripped(a).split(".").map((n) => parseInt(n, 10));
  const pb = stripped(b).split(".").map((n) => parseInt(n, 10));
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

export async function runMigrate(opts: MigrateOptions): Promise<number> {
  if (!(await manifestExists(opts.cwd))) {
    printError({
      message: "no .specforge/manifest.json found",
      remediation:
        "run `specforge init --force` first; `migrate` operates on an installed layout",
      exitCode: 2,
    });
    return 2;
  }

  const manifest = await readManifest(opts.cwd);
  const bundleVer = await bundleVersion(opts.importMetaUrl);
  const target = opts.to ?? bundleVer;

  // Newer-installed-than-bundled refusal.
  if (compareSemver(manifest.framework_version, bundleVer) > 0) {
    printError({
      message: `installed framework_version ${manifest.framework_version} is newer than bundled ${bundleVer}`,
      remediation:
        "run `npx @angelkurten/specforge@latest migrate` to use a CLI that matches your install",
      exitCode: 2,
    });
    return 2;
  }

  const isDowngrade = compareSemver(target, manifest.framework_version) < 0;
  if (isDowngrade && !opts.allowDowngrade) {
    printError({
      message: `--to=${target} is older than installed ${manifest.framework_version}`,
      remediation: "pass --allow-downgrade to opt into a reverse migration",
      exitCode: 2,
    });
    return 2;
  }

  const allMigrations: ReadonlyArray<Migration> = [
    ...ALL_MIGRATIONS,
    ...(opts.extraMigrations ?? []),
  ];
  const plan = planMigrations(manifest.framework_version, target, allMigrations);
  if (plan === null) {
    const available = allMigrations.map((m) => `${m.from}→${m.to}`).join(", ");
    printError({
      message: `no migration path from ${manifest.framework_version} to ${target}`,
      remediation: `bundled migrations cover: ${available}; pick a target from that set, or upgrade the CLI with \`npx @angelkurten/specforge@latest version\``,
      exitCode: 2,
    });
    return 2;
  }

  // Downgrade-specific pre-checks (before any file mutation).
  if (plan.direction === "down") {
    const missingDown = plan.steps.find((m) => m.down === undefined);
    if (missingDown) {
      printError({
        message: `migration ${missingDown.from}→${missingDown.to} does not export down(); cannot downgrade through it`,
        remediation: "no automatic downgrade path; restore from version control or upgrade-then-fix",
        exitCode: 4,
      });
      return 4;
    }
    const sensitive = plan.steps.filter((m) => m.security_sensitive);
    if (sensitive.length > 0 && !opts.acknowledgeSecurityRollback) {
      printError({
        message: `reverse path includes ${sensitive.length} security-sensitive migration(s)`,
        remediation:
          "pass --acknowledge-security-rollback in addition to --allow-downgrade",
        exitCode: 4,
      });
      for (const m of sensitive) {
        process.stderr.write(`  ${m.from}→${m.to}: ${m.description}\n`);
      }
      return 4;
    }
  }

  // Dry-run / default mode: list the plan.
  const apply = opts.apply && !opts.dryRun;
  if (!apply) {
    if (opts.json) {
      writeJson({
        schema_version: "1",
        direction: plan.direction,
        path: plan.steps.map((s) => `${s.from}→${s.to}`),
        security_sensitive_in_path: plan.steps.some(
          (s) => s.security_sensitive,
        ),
        applied: false,
        steps: plan.steps.map((s) => ({
          from: s.from,
          to: s.to,
          description: s.description,
          security_sensitive: s.security_sensitive,
          applied_at: null,
          script_sha256: null,
        })),
      });
    } else {
      if (plan.steps.length === 0) {
        summary(opts, `no migrations needed: installed ${manifest.framework_version} == target ${target}`);
      } else {
        info(opts, `direction: ${plan.direction}`);
        for (const s of plan.steps) {
          info(opts, `  ${s.from}→${s.to}: ${s.description}${s.security_sensitive ? " [security-sensitive]" : ""}`);
        }
        summary(opts, `dry-run: ${plan.steps.length} migration(s) planned; pass --apply to execute`);
      }
    }
    return 0;
  }

  // Apply mode: acquire lock and execute.
  let lock;
  try {
    lock = await acquireLock(opts.cwd, "migrate");
  } catch (e) {
    if (e instanceof LockHeldError) {
      printError({
        message: e.message,
        remediation:
          "wait for the other process to finish, or remove the lock manually if you confirm no process is running",
        exitCode: 5,
      });
      return 5;
    }
    throw e;
  }

  try {
    const appliedReport: Array<{
      step: string;
      applied_at: string;
      script_sha256: string;
      changed_files: string[];
      skipped: boolean;
    }> = [];

    for (const m of plan.steps) {
      const fromV = plan.direction === "up" ? m.from : m.to;
      const toV = plan.direction === "up" ? m.to : m.from;
      const already = manifest.migrations_applied.find(
        (e) =>
          e.from_version === fromV &&
          e.to_version === toV &&
          e.direction === plan.direction,
      );
      if (already) {
        info(opts, `skip   ${m.from}→${m.to} (already applied at ${already.applied_at})`);
        appliedReport.push({
          step: `${m.from}→${m.to}`,
          applied_at: already.applied_at,
          script_sha256: already.script_sha256,
          changed_files: [],
          skipped: true,
        });
        continue;
      }

      try {
        const report =
          plan.direction === "up"
            ? await m.up(opts.cwd)
            : await m.down!(opts.cwd);
        const sha = await migrationScriptSha(opts.importMetaUrl, m.filename);
        const entry: MigrationAppliedEntry = {
          from_version: fromV,
          to_version: toV,
          direction: plan.direction,
          applied_at: new Date().toISOString(),
          script_sha256: sha,
          security_sensitive: m.security_sensitive,
        };
        manifest.migrations_applied.push(entry);
        appliedReport.push({
          step: `${m.from}→${m.to}`,
          applied_at: entry.applied_at,
          script_sha256: entry.script_sha256,
          changed_files: report.changed_files,
          skipped: false,
        });
        info(opts, `apply  ${m.from}→${m.to}: ${report.changed_files.length} file(s) changed`);
      } catch (e) {
        printError({
          message: `migration ${m.from}→${m.to} failed: ${e instanceof Error ? e.message : String(e)}`,
          remediation: "inspect the error and resolve manually; subsequent steps were not attempted",
          exitCode: 4,
        });
        // Persist what we have applied so far.
        await writeManifest(opts.cwd, manifest);
        return 4;
      }
    }

    // Update framework_version in the manifest to reflect the migration target.
    manifest.framework_version = target;
    manifest.last_updated_at = new Date().toISOString();
    await writeManifest(opts.cwd, manifest);

    if (opts.json) {
      writeJson({
        schema_version: "1",
        direction: plan.direction,
        path: plan.steps.map((s) => `${s.from}→${s.to}`),
        security_sensitive_in_path: plan.steps.some((s) => s.security_sensitive),
        applied: true,
        steps: appliedReport,
      });
    } else {
      summary(opts, `migrate complete: ${plan.steps.length} step(s), direction=${plan.direction}, framework_version now ${target}`);
    }
    return 0;
  } finally {
    await lock.release();
  }
}
