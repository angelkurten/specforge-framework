// Row #50: doctor: prd-required-sections
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { mkTmpDir } from "../../helpers.js";
import { validator } from "../../../src/validators/prd-required-sections.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkTmpDir();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

function fullPrd(): string {
  return `# PRD-001: Test PRD

**Status**: Draft

## Impacted Projects

| Project | Impact |
|---|---|
| **specforge** | Test |

## 1. Problem Statement

Content.

## 2. Goals

- Goal

## 3. Non-Goals

- Not this.

## 4. User Flows

Step 1.

## 5. API

None.

## 6. Data Model

None.

## 7. Architecture

Simple.

## 8. Security

Threat model.

## 9. Test Plan

| # | Test | Type | Description | Path |
|---|------|------|-------------|------|
| 1 | test | unit | desc | path/to/test.ts |

## 10. Migration Plan

None.

## 11. Open Questions

- [x] Answered.

---

## Gate: Promotion to \`Implemented\`

\`\`\`yaml
commit_hash: '[TBD]'
tests:
  - '[TBD]'
system_artifact_diff:
  - '[TBD]'
\`\`\`
`;
}

describe("doctor: prd-required-sections", () => {
  it("A PRD missing § 8 Security fails", async () => {
    const content = fullPrd().replace(/## 8\. Security[\s\S]*?(?=## 9\.)/, "");
    await fs.writeFile(path.join(tmpDir, "001-test.md"), content);
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error");
    expect(errors.some((f) => f.message.includes("§ 8 Security"))).toBe(true);
  });

  it("A PRD missing the Impacted Projects table fails", async () => {
    const content = fullPrd().replace(/## Impacted Projects[\s\S]*?\n\n/, "");
    await fs.writeFile(path.join(tmpDir, "001-test.md"), content);
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error");
    expect(errors.some((f) => f.message.includes("Impacted Projects"))).toBe(true);
  });

  it("A PRD missing the gate block fails", async () => {
    const content = fullPrd().replace(/## Gate:[\s\S]*$/, "");
    await fs.writeFile(path.join(tmpDir, "001-test.md"), content);
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error");
    expect(errors.some((f) => f.message.includes("Gate"))).toBe(true);
  });

  it("A complete PRD passes", async () => {
    await fs.writeFile(path.join(tmpDir, "001-test.md"), fullPrd());
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error");
    expect(errors).toHaveLength(0);
  });
});
