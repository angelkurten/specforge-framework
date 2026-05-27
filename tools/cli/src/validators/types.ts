// Shared types for doctor validators.
// Each validator file exports a `run(cwd)` and an `id`.

export type Severity = "error" | "warning" | "info";

export interface Finding {
  rule: string;
  severity: Severity;
  file?: string;
  line?: number;
  message: string;
}

export interface Validator {
  id: string;
  run(cwd: string, opts?: ValidatorOptions): Promise<Finding[]>;
}

export interface ValidatorOptions {
  /** Sibling names to skip during siblings-paths-resolve. */
  ignoreSiblings?: ReadonlyArray<string>;
  /** Bundle hash map, for framework-file-integrity. */
  bundleHashes?: ReadonlyMap<string, string>;
  /** Bundled framework version, for framework-file-integrity. */
  bundledFrameworkVersion?: string;
}
