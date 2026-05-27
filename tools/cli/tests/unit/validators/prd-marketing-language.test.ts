// Row #52: doctor: prd-marketing-language
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { mkTmpDir } from "../../helpers.js";
import { validator } from "../../../src/validators/prd-marketing-language.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkTmpDir();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("doctor: prd-marketing-language", () => {
  it("A PRD containing 'blazingly fast' (case-insensitive) fails", async () => {
    await fs.writeFile(path.join(tmpDir, "001-test.md"), "# PRD\n\nThis is Blazingly Fast.\n");
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error");
    expect(errors.some((f) => f.message.includes("blazingly fast"))).toBe(true);
  });

  it("'enterprise-grade' triggers failure", async () => {
    await fs.writeFile(path.join(tmpDir, "001-test.md"), "# PRD\n\nEnterprise-Grade solution.\n");
    const findings = await validator.run(tmpDir);
    expect(findings.filter((f) => f.severity === "error").length).toBeGreaterThan(0);
  });

  it("'best-in-class' triggers failure", async () => {
    await fs.writeFile(path.join(tmpDir, "001-test.md"), "# PRD\n\nBest-in-class tooling.\n");
    const findings = await validator.run(tmpDir);
    expect(findings.filter((f) => f.severity === "error").length).toBeGreaterThan(0);
  });

  it("'robust' triggers failure", async () => {
    await fs.writeFile(path.join(tmpDir, "001-test.md"), "# PRD\n\nA Robust implementation.\n");
    const findings = await validator.run(tmpDir);
    expect(findings.filter((f) => f.severity === "error").length).toBeGreaterThan(0);
  });

  it("'seamless' triggers failure", async () => {
    await fs.writeFile(path.join(tmpDir, "001-test.md"), "# PRD\n\nA Seamless user experience.\n");
    const findings = await validator.run(tmpDir);
    expect(findings.filter((f) => f.severity === "error").length).toBeGreaterThan(0);
  });

  it("An ADR containing forbidden phrase fails", async () => {
    await fs.writeFile(path.join(tmpDir, "ADR-001-decision.md"), "# ADR\n\nSeamless integration.\n");
    const findings = await validator.run(tmpDir);
    expect(findings.filter((f) => f.severity === "error").length).toBeGreaterThan(0);
  });

  it("A PRD with no forbidden phrases passes", async () => {
    await fs.writeFile(path.join(tmpDir, "001-test.md"), "# PRD\n\nA straightforward implementation.\n");
    const findings = await validator.run(tmpDir);
    expect(findings.filter((f) => f.severity === "error")).toHaveLength(0);
  });
});
