// Row #9: doctor validator: rule-frontmatter
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
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

  // PRD-024 § 9 row 46: `optional-rules/headless-session.md` and the
  // `init --headless`-specific describe block that used to sit below this
  // one are retired. This proves the validator still walks every rule
  // actually installed, now that the eight shipped rules are the whole set.
  it("walks all eight of the repo's real shipped rules and finds no findings", async () => {
    const REPO = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../../../..",
    );
    const rulesDir = path.join(REPO, ".claude", "rules");
    const names = (await fs.readdir(rulesDir)).filter((n) => n.endsWith(".md"));
    expect(names.length, "the repo's own .claude/rules/ is smaller than expected").toBe(8);
    expect(
      names,
      "the retired rule survives in the repo's own installed set",
    ).not.toContain("headless-session.md");
    for (const name of names) {
      await fs.copyFile(
        path.join(rulesDir, name),
        path.join(tmpDir, ".claude", "rules", name),
      );
    }
    const findings = await validator.run(tmpDir);
    expect(findings.filter((f) => f.severity === "error")).toHaveLength(0);
  });
});
