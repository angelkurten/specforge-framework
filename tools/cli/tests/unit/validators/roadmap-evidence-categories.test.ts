// Row #54: doctor: roadmap-evidence-categories
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
    const content = `# Roadmap\n\n### ROADMAP-001\n\nProblem: Need better X.\nStatus: Candidate\n`;
    await fs.writeFile(path.join(tmpDir, "ROADMAP.md"), content);
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error");
    expect(errors.some((f) => f.message.includes("ROADMAP-001") && f.message.includes("zero evidence"))).toBe(true);
  });

  it("An item with only a category-6 hypothesis without a falsifiable validation plan fails", async () => {
    const content = `# Roadmap\n\n### ROADMAP-002\n\nProblem: Need better Y.\nEvidence:\n  - hypothesis: admins want bulk edit\nStatus: Candidate\n`;
    await fs.writeFile(path.join(tmpDir, "ROADMAP.md"), content);
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error");
    expect(errors.some((f) => f.message.includes("ROADMAP-002") && f.message.includes("hypothesis"))).toBe(true);
  });

  it("An item with a category-7 retroactive PRD reference passes", async () => {
    const content = `# Roadmap\n\n### ROADMAP-003\n\nProblem: Need better Z.\nEvidence:\n  - PRD-001\nStatus: Shipped\n`;
    await fs.writeFile(path.join(tmpDir, "ROADMAP.md"), content);
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error" && f.message.includes("ROADMAP-003"));
    expect(errors).toHaveLength(0);
  });

  it("An item with a hypothesis that includes a validation plan passes", async () => {
    const content = `# Roadmap\n\n### ROADMAP-004\n\nEvidence:\n  - hypothesis: admins adopt bulk actions; validate via usability test N>=6 success = >=3/6\n`;
    await fs.writeFile(path.join(tmpDir, "ROADMAP.md"), content);
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error" && f.message.includes("ROADMAP-004"));
    expect(errors).toHaveLength(0);
  });

  it("An item with a URL evidence entry passes", async () => {
    const content = `# Roadmap\n\n### ROADMAP-005\n\nEvidence:\n  - https://competitor.example.com/feature captured 2026-04-01\n`;
    await fs.writeFile(path.join(tmpDir, "ROADMAP.md"), content);
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error" && f.message.includes("ROADMAP-005"));
    expect(errors).toHaveLength(0);
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
