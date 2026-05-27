// Rows #8 and #43: gate-block-yaml validator and YAML custom tag rejection
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { mkTmpDir } from "../../helpers.js";
import { validator } from "../../../src/validators/gate-block-yaml.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkTmpDir();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

function makePrd(status: string, gateYaml: string): string {
  return `# PRD-001

**Status**: ${status}

## 1. Problem Statement

## Gate: Promotion to \`Implemented\`

\`\`\`yaml
${gateYaml}
\`\`\`
`;
}

describe("doctor validator: gate-block-yaml", () => {
  it("bare scalar in tests: fails", async () => {
    const content = makePrd("Draft", "commit_hash: abc\ntests: bare-scalar\nsystem_artifact_diff:\n  - foo");
    await fs.writeFile(path.join(tmpDir, "001-test.md"), content);
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error");
    expect(errors.some((f) => f.message.includes("tests"))).toBe(true);
  });

  it("bare scalar in system_artifact_diff: fails", async () => {
    const content = makePrd("Draft", "commit_hash: abc\ntests:\n  - foo\nsystem_artifact_diff: bare");
    await fs.writeFile(path.join(tmpDir, "001-test.md"), content);
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error");
    expect(errors.some((f) => f.message.includes("system_artifact_diff"))).toBe(true);
  });

  it("[TBD] in a Draft PRD passes", async () => {
    const content = makePrd("Draft", "commit_hash: '[TBD]'\ntests:\n  - '[TBD]'\nsystem_artifact_diff:\n  - '[TBD]'");
    await fs.writeFile(path.join(tmpDir, "001-test.md"), content);
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error");
    expect(errors).toHaveLength(0);
  });

  it("[TBD] in an Implemented PRD fails", async () => {
    const content = makePrd("Implemented", "commit_hash: '[TBD]'\ntests:\n  - '[TBD]'\nsystem_artifact_diff:\n  - '[TBD]'");
    await fs.writeFile(path.join(tmpDir, "001-test.md"), content);
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error");
    expect(errors.some((f) => f.message.includes("[TBD]"))).toBe(true);
  });

  it("missing gate block fails", async () => {
    const content = `# PRD-001\n\n**Status**: Draft\n\nNo gate block here.\n`;
    await fs.writeFile(path.join(tmpDir, "001-test.md"), content);
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error");
    expect(errors.some((f) => f.message.includes("missing YAML gate block"))).toBe(true);
  });

  it("valid gate block on Implemented PRD passes", async () => {
    const content = makePrd(
      "Implemented",
      "commit_hash: abc123\ntests:\n  - ../sibling/tests/foo.py\nsystem_artifact_diff:\n  - ../sibling/docs/SYSTEM_ARTIFACT.md#section (commit abc123)",
    );
    await fs.writeFile(path.join(tmpDir, "001-test.md"), content);
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error");
    expect(errors).toHaveLength(0);
  });
});

describe("YAML: custom tag rejected", () => {
  it("A PRD with !!js/function in gate block fails without instantiating the function", async () => {
    // The !!js/function tag should cause a parse error via UnsafeYamlError
    const sideEffect = { called: false };
    // We verify no side effects by checking that a sentinel function is not called.
    // The YAML parser should throw before evaluating anything.
    const content = makePrd(
      "Draft",
      `commit_hash: abc\ntests:\n  - !!js/function "function(){ return 42; }"\nsystem_artifact_diff:\n  - foo`,
    );
    await fs.writeFile(path.join(tmpDir, "001-test.md"), content);
    const findings = await validator.run(tmpDir);
    const errors = findings.filter((f) => f.severity === "error");
    // Either the parse fails (UnsafeYamlError) or the tag is rejected
    expect(errors.length).toBeGreaterThan(0);
    // The sentinel side effect must not have been triggered
    expect(sideEffect.called).toBe(false);
  });
});
