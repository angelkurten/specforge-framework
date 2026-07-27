// Row #54: doctor: roadmap-evidence-categories
//
// Fixtures use the **bolded** field form that `templates/roadmap.md` actually
// emits. They previously used a bare `Evidence:` the template never produces,
// which let the suite pass green while the validator was blind to every item
// written from the shipped template.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { mkTmpDir } from "../../helpers.js";
import { validator } from "../../../src/validators/roadmap-evidence-categories.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkTmpDir();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("doctor: roadmap-evidence-categories", () => {
  it("A ROADMAP.md item citing zero evidence entries fails", async () => {
    const content = `# Roadmap\n\n### ROADMAP-001\n\n**Problem / outcome**: Need better X.\n**Status**: Candidate\n`;
    await fs.writeFile(path.join(tmpDir, "ROADMAP.md"), content);
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error");
    expect(errors.some((f) => f.message.includes("ROADMAP-001") && f.message.includes("zero evidence"))).toBe(true);
  });

  it("An item with only a category-6 hypothesis without a falsifiable validation plan fails", async () => {
    const content = `# Roadmap\n\n### ROADMAP-002\n\n**Problem / outcome**: Need better Y.\n**Evidence**:\n- hypothesis: admins want bulk edit\n\n**Status**: Candidate\n`;
    await fs.writeFile(path.join(tmpDir, "ROADMAP.md"), content);
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error");
    expect(errors.some((f) => f.message.includes("ROADMAP-002") && f.message.includes("hypothesis"))).toBe(true);
  });

  it("An item with a category-7 retroactive PRD reference passes", async () => {
    const content = `# Roadmap\n\n### ROADMAP-003\n\n**Problem / outcome**: Need better Z.\n**Evidence**:\n- [PRD-001] — retroactive meta-reference\n\n**Status**: Shipped\n`;
    await fs.writeFile(path.join(tmpDir, "ROADMAP.md"), content);
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error" && f.message.includes("ROADMAP-003"));
    expect(errors).toHaveLength(0);
  });

  it("An item with a hypothesis that includes a validation plan passes", async () => {
    const content = `# Roadmap\n\n### ROADMAP-004\n\n**Evidence**:\n- hypothesis: admins adopt bulk actions; validate via usability test N>=6 success = >=3/6\n`;
    await fs.writeFile(path.join(tmpDir, "ROADMAP.md"), content);
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error" && f.message.includes("ROADMAP-004"));
    expect(errors).toHaveLength(0);
  });

  it("An item with a URL evidence entry passes", async () => {
    const content = `# Roadmap\n\n### ROADMAP-005\n\n**Evidence**:\n- https://competitor.example.com/feature captured 2026-04-01\n`;
    await fs.writeFile(path.join(tmpDir, "ROADMAP.md"), content);
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error" && f.message.includes("ROADMAP-005"));
    expect(errors).toHaveLength(0);
  });

  it("The bolded `**Evidence**:` form the template emits is recognised", async () => {
    // Regression: a bare /^Evidence:/ match reported "zero evidence entries"
    // for every item written from templates/roadmap.md.
    const bolded = `# Roadmap\n\n### ROADMAP-006\n\n**Evidence**:\n- SUPPORT-234, SUPPORT-441\n\n**Caveats**: —\n`;
    await fs.writeFile(path.join(tmpDir, "ROADMAP.md"), bolded);
    expect(await validator.run(tmpDir)).toHaveLength(0);
  });

  it("The unbolded `Evidence:` form is still recognised", async () => {
    const plain = `# Roadmap\n\n### ROADMAP-007\n\nEvidence:\n- SUPPORT-234\n`;
    await fs.writeFile(path.join(tmpDir, "ROADMAP.md"), plain);
    expect(await validator.run(tmpDir)).toHaveLength(0);
  });

  it("missing ROADMAP.md produces no findings (validator is lenient on absent file)", async () => {
    const findings = await validator.run(tmpDir);
    expect(findings).toHaveLength(0);
  });

  it("Theme items (ROADMAP-T-NNN) are ignored", async () => {
    const content = `# Roadmap\n\n### ROADMAP-T-001\n\nNo evidence needed for themes.\n`;
    await fs.writeFile(path.join(tmpDir, "ROADMAP.md"), content);
    const findings = await validator.run(tmpDir);
    expect(findings).toHaveLength(0);
  });
});
