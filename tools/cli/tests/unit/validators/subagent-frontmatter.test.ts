// PRD-006 § 9 row 12: doctor validator: subagent-frontmatter.
//
// The validator interface is `run(cwd, opts)` — it reads the install tree, not
// the bundle — so every case here is a planted `cwd` fixture. Asserting
// against the repo's own `.claude/agents/specforge/` would make this a
// conformance test and couple it to whatever the framework currently ships.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";

import {
  validator,
  realpathInside,
} from "../../../src/validators/subagent-frontmatter.js";
import {
  mkTmpDir,
  plantSubagentDefinitions,
  subagentDefinition,
  SUBAGENT_DEFINITIONS,
} from "../../helpers.js";

let tmpDir: string;

/** Absolute path to `.claude/agents/<rest>` inside the fixture. */
function agentsPath(...rest: string[]): string {
  return path.join(tmpDir, ".claude", "agents", ...rest);
}

async function write(rel: string, contents: string): Promise<void> {
  const abs = agentsPath(rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, contents);
}

beforeEach(async () => {
  tmpDir = await mkTmpDir();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("subagent-frontmatter: a correct install", () => {
  it("reports nothing for the 14 definitions", async () => {
    await plantSubagentDefinitions(agentsPath("specforge"));
    expect(await validator.run(tmpDir)).toEqual([]);
    expect(SUBAGENT_DEFINITIONS).toHaveLength(14);
  });

  it("reports nothing when .claude/agents/ is absent", async () => {
    expect(await validator.run(tmpDir)).toEqual([]);
  });

  it("accepts model: inherit", async () => {
    await write(
      "specforge/specforge-backend-reviewer.md",
      subagentDefinition("specforge-backend-reviewer", "inherit"),
    );
    expect(await validator.run(tmpDir)).toEqual([]);
  });
});

// PRD-006 § 9 row 25 (case-sensitive half). The dev machine's default APFS is
// case-insensitive, so a genuinely distinct `SpecForge/` inode cannot be
// created alongside `specforge/` there — the case-sensitive-filesystem
// behaviour is driven at the containment-predicate level instead, with
// distinct realpaths, per the security patch. Row 25's other half (the
// case-INSENSITIVE `SpecForge/` install stays inside → zero findings) lives in
// partition.test.ts and still runs end-to-end.
describe("subagent-frontmatter: identity-based namespace containment (realpathInside)", () => {
  const canonical = "/repo/.claude/agents/specforge";

  it("a candidate at or under the real namespace is inside", () => {
    expect(realpathInside(canonical, canonical)).toBe(true);
    expect(realpathInside(canonical, `${canonical}/x.md`)).toBe(true);
    expect(realpathInside(canonical, `${canonical}/sub/nested.md`)).toBe(true);
  });

  it("a distinct sibling `SpecForge` (case-sensitive fs) is OUTSIDE", () => {
    // On a case-sensitive filesystem `.claude/agents/SpecForge` is a different
    // inode, so its realpath is a sibling of the namespace, not under it. A
    // lowercased-string test would call it inside and skip the class-2 shadow
    // check — exactly the hole this predicate closes.
    expect(
      realpathInside(canonical, "/repo/.claude/agents/SpecForge/forged.md"),
    ).toBe(false);
    expect(realpathInside(canonical, "/repo/.claude/agents/SpecForge")).toBe(
      false,
    );
  });

  it("the namespace parent, siblings, and unrelated paths are outside", () => {
    expect(realpathInside(canonical, "/repo/.claude/agents")).toBe(false);
    expect(realpathInside(canonical, "/repo/.claude/agents/team/x.md")).toBe(
      false,
    );
    expect(realpathInside(canonical, "/elsewhere/specforge/x.md")).toBe(false);
    // A prefix collision that is not a real path child must not slip through.
    expect(realpathInside(canonical, `${canonical}-evil/x.md`)).toBe(false);
  });
});

describe("subagent-frontmatter: schema class inside the namespace", () => {
  it("missing `name` produces one error naming file and field", async () => {
    await write(
      "specforge/broken.md",
      `---\ndescription: "A definition with no name."\nmodel: opus\n---\n\nbody\n`,
    );
    const findings = await validator.run(tmpDir);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe("error");
    expect(findings[0]!.file).toBe(".claude/agents/specforge/broken.md");
    expect(findings[0]!.message).toContain("name");
  });

  it("an un-prefixed name produces one error naming the prefix", async () => {
    await write(
      "specforge/backend-reviewer.md",
      subagentDefinition("backend-reviewer", "opus"),
    );
    const findings = await validator.run(tmpDir);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe("error");
    expect(findings[0]!.file).toBe(".claude/agents/specforge/backend-reviewer.md");
    expect(findings[0]!.message).toContain("specforge-");
  });

  it("a pinned model ID produces one error naming the field", async () => {
    await write(
      "specforge/specforge-backend-reviewer.md",
      subagentDefinition("specforge-backend-reviewer", "claude-opus-5"),
    );
    const findings = await validator.run(tmpDir);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe("error");
    expect(findings[0]!.message).toContain("model");
    expect(findings[0]!.message).toContain("claude-opus-5");
  });

  it("no frontmatter at all produces one error", async () => {
    await write(
      "specforge/specforge-quality-reviewer.md",
      "# A definition with no frontmatter\n\nbody\n",
    );
    const findings = await validator.run(tmpDir);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe("error");
    expect(findings[0]!.message).toContain("frontmatter");
  });

  it("missing `description` produces one error naming the field", async () => {
    await write(
      "specforge/specforge-risk-critic.md",
      `---\nname: specforge-risk-critic\nmodel: opus\n---\n\nbody\n`,
    );
    const findings = await validator.run(tmpDir);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.message).toContain("description");
  });

  it("walks nested files (recursive, unlike rule-frontmatter's one-level read)", async () => {
    await write(
      "specforge/sub/x.md",
      subagentDefinition("not-prefixed", "sonnet"),
    );
    const findings = await validator.run(tmpDir);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.file).toBe(".claude/agents/specforge/sub/x.md");
  });
});

describe("subagent-frontmatter: reserved-prefix class outside the namespace", () => {
  it("flags a specforge-named file at the .claude/agents/ root", async () => {
    await write(
      "specforge-security-reviewer.md",
      subagentDefinition("specforge-security-reviewer", "opus"),
    );
    const findings = await validator.run(tmpDir);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe("error");
    expect(findings[0]!.file).toBe(".claude/agents/specforge-security-reviewer.md");
    expect(findings[0]!.message).toContain("specforge-");
  });

  it("the prefix test is case-insensitive", async () => {
    // The host's name resolution is undocumented; a case-sensitive check would
    // let `SpecForge-security-reviewer` register under the framework identity.
    await write(
      "team/shadow.md",
      subagentDefinition("SpecForge-security-reviewer", "opus"),
    );
    const findings = await validator.run(tmpDir);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe("error");
    expect(findings[0]!.file).toBe(".claude/agents/team/shadow.md");
  });

  it("leaves an adopter's own subagent alone", async () => {
    await write("my-own-agent.md", subagentDefinition("my-own-agent", "sonnet"));
    await write("team/perf-reviewer.md", subagentDefinition("perf-reviewer", "opus"));
    // Nothing about an adopter file is this validator's business: not its
    // model, not its missing fields, not its absent frontmatter.
    await write("team/no-frontmatter.md", "# just a note\n");
    await write("team/pinned.md", subagentDefinition("perf2", "claude-opus-5"));
    expect(await validator.run(tmpDir)).toEqual([]);
  });

  it("ignores non-markdown files", async () => {
    await write("specforge/README.txt", "not a definition\n");
    expect(await validator.run(tmpDir)).toEqual([]);
  });

  it("detects an uppercase `.MD` shadow (case-insensitive extension match)", async () => {
    // `.claude/agents/team/SHADOW.MD` is a real shadow on case-insensitive
    // APFS; a case-sensitive `.md` check produces no finding at all. The
    // .md-only scope is preserved — only the case gap is closed.
    await write(
      "team/SHADOW.MD",
      subagentDefinition("specforge-security-reviewer", "opus"),
    );
    const findings = await validator.run(tmpDir);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe("error");
    expect(findings[0]!.file).toBe(".claude/agents/team/SHADOW.MD");
    expect(findings[0]!.message).toContain("specforge-");
  });
});
