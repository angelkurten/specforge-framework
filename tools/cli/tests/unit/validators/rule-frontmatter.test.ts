// Row #9: doctor validator: rule-frontmatter
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkTmpDir } from "../../helpers.js";
import { validator } from "../../../src/validators/rule-frontmatter.js";
import { runInit } from "../../../src/commands/init.js";
import {
  HEADLESS_RULE_SOURCE,
  HEADLESS_RULE_TARGET,
} from "../../../src/partition.js";

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
});

// PRD-012 phase 3 § 9 row 24.
describe("init --headless installs the headless rule as an unscoped rule", () => {
  const REPO = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../../..",
  );

  /**
   * A bundle carrying the repo's real `optional-rules/headless-session.md`.
   * The shipped bytes are what the assertions below run against — a fixture
   * copy would let the rule and its test drift apart silently.
   */
  async function bundleWithHeadlessRule(parent: string): Promise<string> {
    const pkg = path.join(parent, "fake-pkg");
    const framework = path.join(pkg, "framework");
    await fs.mkdir(path.join(framework, path.dirname(HEADLESS_RULE_SOURCE)), {
      recursive: true,
    });
    await fs.mkdir(path.join(pkg, "dist"), { recursive: true });
    await fs.writeFile(path.join(framework, "VERSION"), "0.0.0-test\n");
    await fs.writeFile(path.join(framework, "CLAUDE.md"), "# specforge\n");
    await fs.copyFile(
      path.join(REPO, HEADLESS_RULE_SOURCE),
      path.join(framework, HEADLESS_RULE_SOURCE),
    );
    return pathToFileURL(path.join(pkg, "dist", "cli.js")).href;
  }

  const created: string[] = [];

  afterEach(async () => {
    for (const d of created.splice(0)) {
      await fs.rm(d, { recursive: true, force: true });
    }
  });

  async function init(headless: boolean): Promise<string> {
    const bundleParent = await mkTmpDir();
    const cwd = await mkTmpDir();
    created.push(bundleParent, cwd);
    const importMetaUrl = await bundleWithHeadlessRule(bundleParent);
    const code = await runInit({
      cwd,
      force: false,
      erase: false,
      noGitSafety: false,
      dryRun: false,
      quiet: true,
      headless,
      importMetaUrl,
    });
    expect(code).toBe(0);
    return cwd;
  }

  it("writes .claude/rules/headless-session.md, and plain init does not", async () => {
    const headlessCwd = await init(true);
    const plainCwd = await init(false);
    await expect(
      fs.access(path.join(headlessCwd, HEADLESS_RULE_TARGET)),
    ).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(plainCwd, HEADLESS_RULE_TARGET)),
    ).rejects.toThrow();
  });

  it("the installed rule passes the validator with no findings", async () => {
    const cwd = await init(true);
    expect(await validator.run(cwd)).toEqual([]);
  });

  it("declares no activation key, so it is unscoped and loads every session", async () => {
    const cwd = await init(true);
    const text = await fs.readFile(path.join(cwd, HEADLESS_RULE_TARGET), "utf8");
    const fm = /^---\n([\s\S]*?)\n---\n/.exec(text);
    expect(fm, "no frontmatter block").not.toBeNull();
    // Frontmatter is the only mechanism that can condition a rule's
    // activation, so "unconditional" is checkable exactly here: the keys are
    // the two every rule carries and nothing else. `paths:` in particular
    // would make it path-scoped rather than always-loaded.
    const keys = [...fm![1]!.matchAll(/^([A-Za-z_][\w-]*):/gm)].map((m) => m[1]);
    expect(keys.sort()).toEqual(["description", "name"]);
  });

  it("the body claims no environment-variable gate of its own", async () => {
    const cwd = await init(true);
    const body = (
      await fs.readFile(path.join(cwd, HEADLESS_RULE_TARGET), "utf8")
    ).replace(/^---\n[\s\S]*?\n---\n/, "");
    // The shape this forbids: "these defaults apply when SPECFORGE_HEADLESS is
    // set". The rule names environment variables in its last row — that row
    // prohibits *reading* them — so the pattern is a conditional plus a
    // variable-shaped token plus a set/equals test, not the mention alone.
    const gate =
      /\b(if|when|whenever|unless|only)\b[^.\n|]{0,80}\b[A-Z][A-Z0-9_]{2,}\b\s*(?:=|is set|is defined|is present|is truthy)/i;
    expect(gate.test(body), "the body gates itself on an environment variable").toBe(false);
    expect(/unconditional/i.test(body)).toBe(true);
  });
});
