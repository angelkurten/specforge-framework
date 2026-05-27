// Row #1: partition classification
import { describe, it, expect } from "vitest";
import { classify } from "../../src/partition.js";

describe("partition classification", () => {
  it("classifies framework files correctly", () => {
    expect(classify("CLAUDE.md")).toBe("framework");
    expect(classify("CONVENTIONS.md")).toBe("framework");
    expect(classify("README.md")).toBe("framework");
    expect(classify("README.es.md")).toBe("framework");
    expect(classify("LICENSE")).toBe("framework");
    expect(classify("CHANGELOG.md")).toBe("framework");
    expect(classify("VERSION")).toBe("framework");
    expect(classify(".claude/rules/hard-rules.md")).toBe("framework");
    expect(classify(".claude/rules/workflow.md")).toBe("framework");
    expect(classify("templates/prd.md")).toBe("framework");
    expect(classify("agents/backend-reviewer.md")).toBe("framework");
    expect(classify("examples/worked-example.md")).toBe("framework");
    expect(classify("scripts/upgrade.sh")).toBe("framework");
    expect(classify(".github/workflows/cli-release.yml")).toBe("framework");
    expect(classify(".github/workflows/specforge-ci.yml")).toBe("framework");
    expect(classify("mkdocs.yml")).toBe("framework");
    expect(classify("requirements-docs.txt")).toBe("framework");
    expect(classify("docs/faq.md")).toBe("framework");
  });

  it("classifies team data files correctly", () => {
    expect(classify("SIBLINGS.md")).toBe("team");
    expect(classify("ROADMAP.md")).toBe("team");
    expect(classify(".specforge/manifest.json")).toBe("team");
    expect(classify(".specforge/lock")).toBe("team");
    expect(classify(".specforge-source")).toBe("team");
  });

  it("classifies root PRD/ADR/AgDR files as team data", () => {
    expect(classify("001-product-roadmap.md")).toBe("team");
    expect(classify("010-foo.md")).toBe("team");
    expect(classify("999-my-prd.md")).toBe("team");
    expect(classify("ADR-001-decision.md")).toBe("team");
    expect(classify("AgDR-001-agent-decision.md")).toBe("team");
  });

  it("rejects non-3-digit PRD numbers", () => {
    // 1-foo.md has only 1 digit — does not match team data pattern for PRDs
    // so it falls to "unknown"
    expect(classify("1-foo.md")).toBe("unknown");
    // But 4-digit PRD numbers are not valid team data either
    expect(classify("0001-foo.md")).toBe("unknown");
  });

  it("classifies ignored paths", () => {
    expect(classify(".git/config")).toBe("ignored");
    expect(classify(".gitignore")).toBe("ignored");
    expect(classify(".gitattributes")).toBe("ignored");
    expect(classify("node_modules/foo/bar.js")).toBe("ignored");
    expect(classify("dist/cli.js")).toBe("ignored");
    expect(classify("build/out.js")).toBe("ignored");
    expect(classify(".DS_Store")).toBe("ignored");
    expect(classify("Thumbs.db")).toBe("ignored");
  });

  it("classifies unknown paths", () => {
    expect(classify("my-custom-file.txt")).toBe("unknown");
    expect(classify("src/foo.ts")).toBe("unknown");
    expect(classify("custom-docs/readme.md")).toBe("unknown");
  });

  it("framework workflows take precedence over team-data wildcard", () => {
    // The two reserved workflow names are in FRAMEWORK_FILES so must be
    // "framework" even though .github/workflows/* is also in team data.
    expect(classify(".github/workflows/cli-release.yml")).toBe("framework");
    expect(classify(".github/workflows/specforge-ci.yml")).toBe("framework");
    // Other team workflows are team data
    expect(classify(".github/workflows/my-ci.yml")).toBe("team");
  });

  it("nested NNN-*.md files are unknown (root-only enforcement)", () => {
    // The partition regex for PRDs matches any path without '/', so a nested
    // file like subdir/001-foo.md doesn't match because the regex is anchored
    // and has no directory component.
    expect(classify("subdir/001-foo.md")).toBe("unknown");
  });

  it("case sensitivity: ADR-NNN must be uppercase ADR prefix", () => {
    expect(classify("ADR-001-x.md")).toBe("team");
    // lowercase adr is not a valid team pattern (regex is case-sensitive)
    expect(classify("adr-001-x.md")).toBe("unknown");
  });
});
