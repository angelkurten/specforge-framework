// Row #51: doctor: prd-back-refs
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { mkTmpDir } from "../../helpers.js";
import { validator } from "../../../src/validators/prd-back-refs.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkTmpDir();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("doctor: prd-back-refs", () => {
  it("A PRD containing a '> **Updated by PRD-005**' line fails", async () => {
    const content = `# PRD-001\n\n**Status**: Draft\n\n> **Updated by PRD-005**\n\nContent.\n`;
    await fs.writeFile(path.join(tmpDir, "001-test.md"), content);
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error");
    expect(errors.some((f) => f.message.includes("back-reference"))).toBe(true);
  });

  it("A PRD with the canonical Depends on header passes", async () => {
    const content = `# PRD-002\n\n**Status**: Draft\n**Depends on**: PRD-001\n\nContent.\n`;
    await fs.writeFile(path.join(tmpDir, "002-test.md"), content);
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error");
    expect(errors).toHaveLength(0);
  });

  it("A PRD with no back-refs passes", async () => {
    const content = `# PRD-001\n\n**Status**: Draft\n\nJust a PRD without back-refs.\n`;
    await fs.writeFile(path.join(tmpDir, "001-test.md"), content);
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error");
    expect(errors).toHaveLength(0);
  });

  it("Reports the line number of the violation", async () => {
    const content = `# PRD-001\n\n**Status**: Draft\n\nLine 5 is fine.\n> **Updated by PRD-005**\nLine 7.\n`;
    await fs.writeFile(path.join(tmpDir, "001-test.md"), content);
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error");
    expect(errors[0]?.line).toBeDefined();
    expect(errors[0]!.line).toBeGreaterThan(0);
  });
});
