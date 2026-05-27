// Row #6: doctor validator: prd-numbering
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { mkTmpDir } from "../../helpers.js";
import { validator } from "../../../src/validators/prd-numbering.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkTmpDir();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("doctor validator: prd-numbering", () => {
  it("detects duplicate PRD numbers", async () => {
    await fs.writeFile(path.join(tmpDir, "001-first.md"), "# PRD 1");
    await fs.writeFile(path.join(tmpDir, "001-second.md"), "# PRD 1 dupe");
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error");
    expect(errors.some((f) => f.message.includes("duplicate"))).toBe(true);
  });

  it("detects non-three-digit PRD names as error", async () => {
    await fs.writeFile(path.join(tmpDir, "1-foo.md"), "# Bad PRD");
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error");
    // 1-foo.md matches BAD_RE and is not ADR/AgDR prefixed
    expect(errors.some((f) => f.message.includes("3-digit"))).toBe(true);
  });

  it("reports non-monotonic gap as warning", async () => {
    await fs.writeFile(path.join(tmpDir, "001-first.md"), "# PRD 1");
    await fs.writeFile(path.join(tmpDir, "003-third.md"), "# PRD 3");
    const findings = await validator.run(tmpDir);
    const warnings = findings.filter((f) => f.severity === "warning");
    expect(warnings.some((f) => f.message.includes("gap"))).toBe(true);
  });

  it("passes on a single monotonic PRD with no gaps", async () => {
    await fs.writeFile(path.join(tmpDir, "001-only.md"), "# PRD 1");
    const findings = await validator.run(tmpDir);
    expect(findings.filter((f) => f.severity === "error")).toHaveLength(0);
  });

  it("passes on sequential PRDs with no gaps", async () => {
    await fs.writeFile(path.join(tmpDir, "001-first.md"), "# PRD 1");
    await fs.writeFile(path.join(tmpDir, "002-second.md"), "# PRD 2");
    const findings = await validator.run(tmpDir);
    expect(findings.filter((f) => f.severity === "error")).toHaveLength(0);
    expect(findings.filter((f) => f.severity === "warning")).toHaveLength(0);
  });

  it("ADR and AgDR files are not treated as bad PRD names", async () => {
    await fs.writeFile(path.join(tmpDir, "ADR-001-decision.md"), "# ADR 1");
    await fs.writeFile(path.join(tmpDir, "AgDR-001-agent.md"), "# AgDR 1");
    const findings = await validator.run(tmpDir);
    expect(findings.filter((f) => f.severity === "error")).toHaveLength(0);
  });
});
