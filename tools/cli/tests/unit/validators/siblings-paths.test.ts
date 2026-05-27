// Row #7: doctor validator: siblings-paths-resolve
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { mkTmpDir } from "../../helpers.js";
import { validator } from "../../../src/validators/siblings-paths-resolve.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkTmpDir();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

function siblingsContent(rows: Array<{ name: string; path: string; status: string }>) {
  const header = "| Name | Path | Status | Read first |\n|---|---|---|---|\n";
  const rowLines = rows.map((r) => `| ${r.name} | ${r.path} | ${r.status} | - |`).join("\n");
  return `# Siblings\n\n${header}${rowLines}\n`;
}

describe("doctor validator: siblings-paths-resolve", () => {
  it("active row whose path does not resolve on disk fails", async () => {
    await fs.writeFile(
      path.join(tmpDir, "SIBLINGS.md"),
      siblingsContent([{ name: "missing-sibling", path: "../does-not-exist", status: "active" }]),
    );
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error");
    expect(errors.some((f) => f.message.includes("missing-sibling"))).toBe(true);
  });

  it("retired rows are ignored even if path does not resolve", async () => {
    await fs.writeFile(
      path.join(tmpDir, "SIBLINGS.md"),
      siblingsContent([{ name: "retired-sibling", path: "../does-not-exist", status: "retired" }]),
    );
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error");
    expect(errors.filter((f) => f.message.includes("retired-sibling"))).toHaveLength(0);
  });

  it("active row with resolving path passes", async () => {
    const siblingDir = path.join(tmpDir, "my-sibling");
    await fs.mkdir(siblingDir);
    await fs.writeFile(
      path.join(tmpDir, "SIBLINGS.md"),
      siblingsContent([{ name: "my-sibling", path: "./my-sibling", status: "active" }]),
    );
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error");
    expect(errors.filter((f) => f.message.includes("my-sibling"))).toHaveLength(0);
  });

  it("missing SIBLINGS.md fails with an error", async () => {
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error");
    expect(errors.some((f) => f.message.includes("SIBLINGS.md"))).toBe(true);
  });
});
