// Row #9: doctor validator: rule-frontmatter
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { mkTmpDir } from "../../helpers.js";
import { validator } from "../../../src/validators/rule-frontmatter.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkTmpDir();
  await fs.mkdir(path.join(tmpDir, ".claude", "rules"), { recursive: true });
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("doctor validator: rule-frontmatter", () => {
  it("missing name field fails", async () => {
    await fs.writeFile(
      path.join(tmpDir, ".claude", "rules", "no-name.md"),
      "---\ndescription: A rule without name\n---\n# Rule\n",
    );
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error");
    expect(errors.some((f) => f.message.includes("name"))).toBe(true);
  });

  it("missing description field fails", async () => {
    await fs.writeFile(
      path.join(tmpDir, ".claude", "rules", "no-desc.md"),
      "---\nname: no-desc\n---\n# Rule\n",
    );
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error");
    expect(errors.some((f) => f.message.includes("description"))).toBe(true);
  });

  it("missing frontmatter entirely fails", async () => {
    await fs.writeFile(
      path.join(tmpDir, ".claude", "rules", "no-fm.md"),
      "# Rule Without Frontmatter\n\nSome content.\n",
    );
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error");
    expect(errors.some((f) => f.message.includes("frontmatter"))).toBe(true);
  });

  it("valid rule with name and description passes", async () => {
    await fs.writeFile(
      path.join(tmpDir, ".claude", "rules", "valid.md"),
      "---\nname: valid-rule\ndescription: A valid unscoped rule\n---\n# Rule\n",
    );
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error");
    expect(errors).toHaveLength(0);
  });

  it("path-scoped rule (adr-specific) with paths: list is accepted", async () => {
    await fs.writeFile(
      path.join(tmpDir, ".claude", "rules", "adr-specific.md"),
      "---\nname: adr-specific\ndescription: ADR-specific rule\npaths:\n  - 'ADR-*.md'\n---\n# Rule\n",
    );
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error");
    expect(errors).toHaveLength(0);
  });

  it("path-scoped rule (adr-specific) without paths: list fails", async () => {
    await fs.writeFile(
      path.join(tmpDir, ".claude", "rules", "adr-specific.md"),
      "---\nname: adr-specific\ndescription: ADR-specific rule\n---\n# Rule\n",
    );
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error");
    expect(errors.some((f) => f.message.includes("paths"))).toBe(true);
  });

  it("empty rules directory produces no findings", async () => {
    const findings = await validator.run(tmpDir);
    expect(findings).toHaveLength(0);
  });
});
