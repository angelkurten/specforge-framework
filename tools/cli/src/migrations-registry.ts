// Migration registry. Each migration module declares `from`, `to`,
// `description`, an optional `security_sensitive`, plus `up` and optionally
// `down`. PRD-003 § 7.5.
//
// Migration modules are bundled with the package and statically imported
// here — never loaded from user disk (§ 8.2).

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import * as m_0_6_0_to_0_7_0 from "../migrations/0.6.0-to-0.7.0.js";

export interface MigrationReport {
  description: string;
  changed_files: string[];
}

export interface Migration {
  from: string;
  to: string;
  description: string;
  security_sensitive: boolean;
  up: (cwd: string) => Promise<MigrationReport>;
  down?: (cwd: string) => Promise<MigrationReport>;
  /** Module-relative filename, for sha256 forensics. */
  filename: string;
}

function toMigration(mod: any, filename: string): Migration {
  return {
    from: String(mod.from),
    to: String(mod.to),
    description: String(mod.description),
    security_sensitive: mod.security_sensitive === true,
    up: mod.up,
    down: typeof mod.down === "function" ? mod.down : undefined,
    filename,
  };
}

export const BUNDLED_MIGRATIONS: ReadonlyArray<Migration> = [
  toMigration(m_0_6_0_to_0_7_0, "0.6.0-to-0.7.0.ts"),
];

/**
 * Test-only injection point. Production code reads ALL_MIGRATIONS, which is
 * always the bundled set. Tests pass extra migrations via the `extraMigrations`
 * option on commands that take it (e.g. `runMigrate`), and those commands
 * compose them with the bundled list internally. Nothing user-supplied lands
 * here in production — see PRD-003 § 8.2.
 */
export const ALL_MIGRATIONS: ReadonlyArray<Migration> = BUNDLED_MIGRATIONS;

/** Construct a Migration from a bare object, for test fixtures. */
export function makeTestMigration(spec: {
  from: string;
  to: string;
  description: string;
  security_sensitive?: boolean;
  up: (cwd: string) => Promise<MigrationReport>;
  down?: (cwd: string) => Promise<MigrationReport>;
  filename?: string;
}): Migration {
  return {
    from: spec.from,
    to: spec.to,
    description: spec.description,
    security_sensitive: spec.security_sensitive === true,
    up: spec.up,
    down: spec.down,
    filename: spec.filename ?? `test-${spec.from}-to-${spec.to}.ts`,
  };
}

/**
 * sha256 of a bundled migration script's source file. Used for the
 * `script_sha256` field in `migrations_applied` (§ 6.1 forensics).
 *
 * In a published install, the source `.ts` files are not shipped — only
 * the compiled `.js` lives in `dist/`. We hash whichever exists.
 */
export async function migrationScriptSha(
  importMetaUrl: string,
  filename: string,
): Promise<string> {
  const here = path.dirname(fileURLToPath(importMetaUrl));
  // src/ -> ../migrations  in dev; dist/ -> ../migrations in pub.
  const candidates = [
    path.resolve(here, "..", "migrations", filename),
    path.resolve(here, "..", "migrations", filename.replace(/\.ts$/, ".js")),
  ];
  for (const c of candidates) {
    try {
      const bytes = await fs.readFile(c);
      return createHash("sha256").update(bytes).digest("hex");
    } catch {
      // keep trying
    }
  }
  return "unknown";
}

function cmpSemver(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10));
  const pb = b.split(".").map((n) => parseInt(n, 10));
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

/**
 * Compute the ordered list of migrations to apply between `from` and `to`.
 * Returns `null` if no path exists.
 *
 * Direction is inferred from the comparison: from < to ⇒ "up", from > to ⇒
 * "down". The returned migrations are ordered for execution (up: ascending
 * `from`, down: descending `to`).
 */
export function planMigrations(
  from: string,
  to: string,
  migrations: ReadonlyArray<Migration> = ALL_MIGRATIONS,
): { direction: "up" | "down"; steps: Migration[] } | null {
  const cmp = cmpSemver(from, to);
  if (cmp === 0) return { direction: "up", steps: [] };

  if (cmp < 0) {
    // Upgrade: chain forward.
    const sorted = [...migrations].sort((a, b) => cmpSemver(a.from, b.from));
    const steps: Migration[] = [];
    let current = from;
    while (cmpSemver(current, to) < 0) {
      const next = sorted.find((m) => m.from === current);
      if (!next) return null;
      steps.push(next);
      current = next.to;
      if (cmpSemver(current, to) > 0) return null;
    }
    return { direction: "up", steps };
  } else {
    // Downgrade: chain backward.
    const sorted = [...migrations].sort((a, b) => cmpSemver(b.to, a.to));
    const steps: Migration[] = [];
    let current = from;
    while (cmpSemver(current, to) > 0) {
      const next = sorted.find((m) => m.to === current);
      if (!next) return null;
      steps.push(next);
      current = next.from;
      if (cmpSemver(current, to) < 0) return null;
    }
    return { direction: "down", steps };
  }
}
