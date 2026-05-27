// Row #53: doctor: prd-system-artifact-diff
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { mkTmpDir } from "../../helpers.js";
import { validator } from "../../../src/validators/prd-system-artifact-diff.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkTmpDir();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

function makeSiblings(rows: Array<{ name: string; readFirst: string }>) {
  const header = `| Name | Path | Status | Read first |\n|---|---|---|---|\n`;
  const lines = rows.map((r) => `| ${r.name} | ../sibling | active | ${r.readFirst} |`).join("\n");
  return `# Siblings\n\n${header}${lines}\n`;
}

function makeImplementedPrd(
  siblings: string[],
  diffEntries: string[],
) {
  const rows = siblings.map((s) => `| **${s}** | Impact |`).join("\n");
  const diffYaml = diffEntries.length === 0
    ? "[]"
    : diffEntries.map((e) => `  - ${e}`).join("\n");
  return `# PRD-001

**Status**: Implemented

## Impacted Projects

| Project | Impact |
|---|---|
${rows}

## 1. Problem Statement

## Gate: Promotion to \`Implemented\`

\`\`\`yaml
commit_hash: abc123
tests:
  - foo.py
system_artifact_diff:
${diffEntries.length === 0 ? "  []" : diffEntries.map((e) => `  - ${e}`).join("\n")}
\`\`\`
`;
}

describe("doctor: prd-system-artifact-diff", () => {
  it("Implemented PRD impacting two siblings (one with SYSTEM_ARTIFACT.md, one without) requires exactly one entry", async () => {
    await fs.writeFile(
      path.join(tmpDir, "SIBLINGS.md"),
      makeSiblings([
        { name: "sibling-with-artifact", readFirst: "SYSTEM_ARTIFACT.md" },
        { name: "sibling-without", readFirst: "README.md" },
      ]),
    );
    // Correct: one entry
    const correctPrd = makeImplementedPrd(
      ["sibling-with-artifact", "sibling-without"],
      ["../sibling-with-artifact/SYSTEM_ARTIFACT.md#section (commit abc123)"],
    );
    await fs.writeFile(path.join(tmpDir, "001-test.md"), correctPrd);
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error");
    expect(errors).toHaveLength(0);
  });

  it("zero entries for an Implemented PRD that needs one fails", async () => {
    await fs.writeFile(
      path.join(tmpDir, "SIBLINGS.md"),
      makeSiblings([
        { name: "sibling-with-artifact", readFirst: "SYSTEM_ARTIFACT.md" },
      ]),
    );
    const prd = makeImplementedPrd(["sibling-with-artifact"], []);
    await fs.writeFile(path.join(tmpDir, "001-test.md"), prd);
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error");
    expect(errors.length).toBeGreaterThan(0);
  });

  it("two entries when only one is expected fails", async () => {
    await fs.writeFile(
      path.join(tmpDir, "SIBLINGS.md"),
      makeSiblings([
        { name: "sibling-with-artifact", readFirst: "SYSTEM_ARTIFACT.md" },
        { name: "sibling-without", readFirst: "README.md" },
      ]),
    );
    const prd = makeImplementedPrd(
      ["sibling-with-artifact", "sibling-without"],
      [
        "../sibling-with-artifact/SYSTEM_ARTIFACT.md#a (commit abc)",
        "../sibling-without/SYSTEM_ARTIFACT.md#b (commit abc)",
      ],
    );
    await fs.writeFile(path.join(tmpDir, "001-test.md"), prd);
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error");
    expect(errors.length).toBeGreaterThan(0);
  });

  it("Draft PRDs are not checked", async () => {
    await fs.writeFile(
      path.join(tmpDir, "SIBLINGS.md"),
      makeSiblings([{ name: "sibling", readFirst: "SYSTEM_ARTIFACT.md" }]),
    );
    const prd = `# PRD-001\n\n**Status**: Draft\n\n## Impacted Projects\n\n| Project | Impact |\n|---|---|\n| sibling | test |\n\n## Gate: Promotion to \`Implemented\`\n\n\`\`\`yaml\ncommit_hash: '[TBD]'\ntests:\n  - '[TBD]'\nsystem_artifact_diff:\n  - '[TBD]'\n\`\`\`\n`;
    await fs.writeFile(path.join(tmpDir, "001-test.md"), prd);
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error");
    expect(errors).toHaveLength(0);
  });
});
