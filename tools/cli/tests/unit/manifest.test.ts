// Row #3: manifest schema validation
import { describe, it, expect } from "vitest";
import { validateManifest, ManifestError } from "../../src/manifest.js";

const VALID: unknown = {
  schema_version: "1",
  framework_version: "0.7.0",
  installed_at: "2026-05-27T00:00:00Z",
  last_updated_at: "2026-05-27T00:00:00Z",
  last_doctor_at: null,
  framework_files: [
    { path: "CLAUDE.md", sha256_at_install: "abc123" },
  ],
  migrations_applied: [],
};

describe("manifest schema validation", () => {
  it("accepts a well-formed manifest", () => {
    const m = validateManifest(VALID);
    expect(m.framework_version).toBe("0.7.0");
    expect(m.framework_files).toHaveLength(1);
  });

  it("rejects null input", () => {
    expect(() => validateManifest(null)).toThrow(ManifestError);
  });

  it("rejects non-object input", () => {
    expect(() => validateManifest("string")).toThrow(ManifestError);
    expect(() => validateManifest(42)).toThrow(ManifestError);
  });

  it("rejects missing schema_version with a precise error", () => {
    const bad = { ...VALID as object, schema_version: undefined };
    expect(() => validateManifest(bad)).toThrow(ManifestError);
    try { validateManifest(bad); } catch (e) {
      expect((e as ManifestError).message).toContain("schema_version");
    }
  });

  it("rejects wrong schema_version", () => {
    const bad = { ...VALID as object, schema_version: "2" };
    expect(() => validateManifest(bad)).toThrow(ManifestError);
  });

  it("rejects missing framework_version", () => {
    const bad = { ...VALID as object, framework_version: undefined };
    expect(() => validateManifest(bad)).toThrow(ManifestError);
    try { validateManifest(bad); } catch (e) {
      expect((e as ManifestError).message).toContain("framework_version");
    }
  });

  it("rejects missing installed_at", () => {
    const bad = { ...VALID as object, installed_at: undefined };
    expect(() => validateManifest(bad)).toThrow(ManifestError);
  });

  it("rejects missing framework_files array", () => {
    const bad = { ...VALID as object, framework_files: undefined };
    expect(() => validateManifest(bad)).toThrow(ManifestError);
    try { validateManifest(bad); } catch (e) {
      expect((e as ManifestError).message).toContain("framework_files");
    }
  });

  it("rejects framework_files entry missing path", () => {
    const bad = {
      ...VALID as object,
      framework_files: [{ sha256_at_install: "abc" }],
    };
    expect(() => validateManifest(bad)).toThrow(ManifestError);
    try { validateManifest(bad); } catch (e) {
      expect((e as ManifestError).message).toContain("path");
    }
  });

  it("rejects framework_files entry missing sha256_at_install", () => {
    const bad = {
      ...VALID as object,
      framework_files: [{ path: "CLAUDE.md" }],
    };
    expect(() => validateManifest(bad)).toThrow(ManifestError);
  });

  it("rejects migrations_applied entry with invalid direction", () => {
    const bad = {
      ...VALID as object,
      migrations_applied: [{
        from_version: "0.6.0",
        to_version: "0.7.0",
        direction: "sideways",
        applied_at: "2026-01-01T00:00:00Z",
        script_sha256: "abc",
        security_sensitive: false,
      }],
    };
    expect(() => validateManifest(bad)).toThrow(ManifestError);
  });

  it("accepts last_doctor_at as null", () => {
    const m = validateManifest({ ...VALID as object, last_doctor_at: null });
    expect(m.last_doctor_at).toBeNull();
  });

  it("accepts last_doctor_at as a string", () => {
    const m = validateManifest({ ...VALID as object, last_doctor_at: "2026-05-27T00:00:00Z" });
    expect(m.last_doctor_at).toBe("2026-05-27T00:00:00Z");
  });
});
