// .specforge/manifest.json — read, write, validate.
// PRD-003 § 6.1. JSON only (no YAML, no eval).

import { promises as fs } from "node:fs";
import * as path from "node:path";

export const MANIFEST_REL = ".specforge/manifest.json";
export const MANIFEST_SCHEMA_VERSION = "1";

export interface FrameworkFileEntry {
  path: string;
  sha256_at_install: string;
}

export interface MigrationAppliedEntry {
  from_version: string;
  to_version: string;
  direction: "up" | "down";
  applied_at: string;
  script_sha256: string;
  security_sensitive: boolean;
}

export interface Manifest {
  schema_version: string;
  framework_version: string;
  installed_at: string;
  last_updated_at: string;
  last_doctor_at: string | null;
  framework_files: FrameworkFileEntry[];
  migrations_applied: MigrationAppliedEntry[];
}

export class ManifestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ManifestError";
  }
}

function manifestPath(cwd: string): string {
  return path.join(cwd, MANIFEST_REL);
}

export async function manifestExists(cwd: string): Promise<boolean> {
  try {
    await fs.access(manifestPath(cwd));
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate the manifest's shape. Returns the manifest typed; throws
 * ManifestError on any schema violation.
 */
export function validateManifest(raw: unknown): Manifest {
  if (raw === null || typeof raw !== "object") {
    throw new ManifestError("manifest is not an object");
  }
  const obj = raw as Record<string, unknown>;

  const requireString = (key: string): string => {
    const v = obj[key];
    if (typeof v !== "string") {
      throw new ManifestError(`manifest.${key} is missing or not a string`);
    }
    return v;
  };
  const optString = (key: string): string | null => {
    const v = obj[key];
    if (v === null) return null;
    if (typeof v === "string") return v;
    throw new ManifestError(`manifest.${key} is not a string or null`);
  };
  const requireArray = (key: string): unknown[] => {
    const v = obj[key];
    if (!Array.isArray(v)) {
      throw new ManifestError(`manifest.${key} is missing or not an array`);
    }
    return v;
  };

  const schema_version = requireString("schema_version");
  if (schema_version !== MANIFEST_SCHEMA_VERSION) {
    throw new ManifestError(
      `manifest.schema_version is ${schema_version}; expected ${MANIFEST_SCHEMA_VERSION}`,
    );
  }
  const framework_version = requireString("framework_version");
  const installed_at = requireString("installed_at");
  const last_updated_at = requireString("last_updated_at");
  const last_doctor_at = optString("last_doctor_at");

  const framework_files: FrameworkFileEntry[] = requireArray("framework_files").map(
    (e, i) => {
      if (e === null || typeof e !== "object") {
        throw new ManifestError(`manifest.framework_files[${i}] is not an object`);
      }
      const f = e as Record<string, unknown>;
      if (typeof f.path !== "string") {
        throw new ManifestError(`manifest.framework_files[${i}].path missing`);
      }
      if (typeof f.sha256_at_install !== "string") {
        throw new ManifestError(
          `manifest.framework_files[${i}].sha256_at_install missing`,
        );
      }
      return {
        path: f.path,
        sha256_at_install: f.sha256_at_install,
      };
    },
  );

  const migrations_applied: MigrationAppliedEntry[] = requireArray(
    "migrations_applied",
  ).map((e, i) => {
    if (e === null || typeof e !== "object") {
      throw new ManifestError(
        `manifest.migrations_applied[${i}] is not an object`,
      );
    }
    const m = e as Record<string, unknown>;
    const dir = m.direction;
    if (dir !== "up" && dir !== "down") {
      throw new ManifestError(
        `manifest.migrations_applied[${i}].direction must be "up" or "down"`,
      );
    }
    return {
      from_version: String(m.from_version ?? ""),
      to_version: String(m.to_version ?? ""),
      direction: dir,
      applied_at: String(m.applied_at ?? ""),
      script_sha256: String(m.script_sha256 ?? ""),
      security_sensitive: m.security_sensitive === true,
    };
  });

  return {
    schema_version,
    framework_version,
    installed_at,
    last_updated_at,
    last_doctor_at,
    framework_files,
    migrations_applied,
  };
}

export async function readManifest(cwd: string): Promise<Manifest> {
  let raw: string;
  try {
    raw = await fs.readFile(manifestPath(cwd), "utf8");
  } catch (e: any) {
    if (e && e.code === "ENOENT") {
      throw new ManifestError(`no .specforge/manifest.json found at ${cwd}`);
    }
    throw new ManifestError(
      `failed to read manifest: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new ManifestError(
      `manifest at .specforge/manifest.json is malformed (${e instanceof Error ? e.message : String(e)})`,
    );
  }
  return validateManifest(parsed);
}

export async function writeManifest(
  cwd: string,
  m: Manifest,
): Promise<void> {
  const p = manifestPath(cwd);
  await fs.mkdir(path.dirname(p), { recursive: true });
  const body = JSON.stringify(m, null, 2) + "\n";
  await fs.writeFile(p, body, "utf8");
}

/**
 * Build a fresh manifest at install/update time.
 */
export function buildManifest(args: {
  framework_version: string;
  framework_files: FrameworkFileEntry[];
  now: string;
  prior?: Manifest;
}): Manifest {
  return {
    schema_version: MANIFEST_SCHEMA_VERSION,
    framework_version: args.framework_version,
    installed_at: args.prior?.installed_at ?? args.now,
    last_updated_at: args.now,
    last_doctor_at: args.prior?.last_doctor_at ?? null,
    framework_files: args.framework_files,
    migrations_applied: args.prior?.migrations_applied ?? [],
  };
}
