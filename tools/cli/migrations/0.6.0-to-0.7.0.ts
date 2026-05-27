// Migration 0.6.0 → 0.7.0.
//
// No team-data schema change is required between these two framework
// versions: the v0.7.0 release introduces the CLI itself (PRD-003) but
// does not alter the shape of SIBLINGS.md, ROADMAP.md, PRD frontmatter, or
// the gate block. This migration is therefore a tracked no-op — its
// presence validates the migration plumbing (registration, idempotency,
// manifest recording) and provides a downgrade target.
//
// If a later release does change team-data shape, that migration replaces
// this no-op (or chains after it).

export const from = "0.6.0";
export const to = "0.7.0";
export const description = "no-op: framework v0.6.0 → v0.7.0 has no team-data schema change";
export const security_sensitive = false;

export interface MigrationReport {
  description: string;
  changed_files: string[];
}

export async function up(_cwd: string): Promise<MigrationReport> {
  return {
    description,
    changed_files: [],
  };
}

export async function down(_cwd: string): Promise<MigrationReport> {
  return {
    description: `reverse of: ${description}`,
    changed_files: [],
  };
}
