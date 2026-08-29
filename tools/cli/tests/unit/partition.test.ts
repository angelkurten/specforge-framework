// Row #1: partition classification
// PRD-005 § 9 rows 1-4: the eight paths that left FRAMEWORK_FILES, the ones
// that stayed, the BUNDLE_ONLY_FILES contract, and the --erase blast radius.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";

import { BUNDLE_ONLY_FILES, classify, FRAMEWORK_FILES } from "../../src/partition.js";
import { runInit } from "../../src/commands/init.js";
import { validator as subagentFrontmatter } from "../../src/validators/subagent-frontmatter.js";
import {
  mkTmpDir,
  plantSubagentDefinitions,
  synthBundleImportMetaUrl,
} from "../helpers.js";

describe("partition classification", () => {
  // PRD-005 § 9 row 2 — regression guard against over-removal.
  it("classifies framework files correctly", () => {
    expect(classify("CLAUDE.md")).toBe("framework");
    expect(classify("CONVENTIONS.md")).toBe("framework");
    expect(classify("README.md")).toBe("framework");
    expect(classify("README.es.md")).toBe("framework");
    expect(classify("LICENSE")).toBe("framework");
    expect(classify(".claude/rules/hard-rules.md")).toBe("framework");
    expect(classify(".claude/rules/workflow.md")).toBe("framework");
    expect(classify("templates/prd.md")).toBe("framework");
    expect(classify("examples/worked-example.md")).toBe("framework");
    // PRD-006 § 9 row 1 — the namespaced subagent definitions.
    expect(
      classify(".claude/agents/specforge/specforge-backend-reviewer.md"),
    ).toBe("framework");
    expect(classify(".claude/agents/specforge/sub/nested.md")).toBe("framework");
  });

  // PRD-005 § 9 row 1 — the vacated paths.
  it("classifies specforge's own project metadata as unknown", () => {
    expect(classify("CHANGELOG.md")).toBe("unknown");
    expect(classify("VERSION")).toBe("unknown");
    expect(classify("mkdocs.yml")).toBe("unknown");
    expect(classify("requirements-docs.txt")).toBe("unknown");
    expect(classify("docs/x.md")).toBe("unknown");
    expect(classify("docs/a/b.md")).toBe("unknown");
    expect(classify("scripts/upgrade.sh")).toBe("unknown");
  });

  // PRD-006 § 9 row 2 — the briefings left `agents/`; stale copies must be
  // inert to the CLI (never refreshed by `update`, never erased).
  it("declassifies the vacated agents/ briefing directory", () => {
    expect(classify("agents/backend-reviewer.md")).toBe("unknown");
    expect(classify("agents/roadmap-market-generator.md")).toBe("unknown");
    expect(classify("agents/nested/x.md")).toBe("unknown");
  });

  // PRD-006 § 9 row 3 — the pattern's prefix precision is what keeps the
  // adopter's own subagents out of the framework class.
  it("claims only the specforge/ subdirectory of .claude/agents/", () => {
    expect(classify(".claude/agents/my-own-agent.md")).toBe("unknown");
    expect(classify(".claude/agents/specforge-lookalike/x.md")).toBe("unknown");
    expect(classify(".claude/agentsX/y.md")).toBe("unknown");
    expect(classify(".claude/agents/team/perf-reviewer.md")).toBe("unknown");
  });

  it("classifies the two reserved workflow names as team data via the catch-all", () => {
    // They left FRAMEWORK_FILES; `.github/workflows/*` in TEAM_DATA_PATTERNS
    // is what catches them now.
    expect(classify(".github/workflows/cli-release.yml")).toBe("team");
    expect(classify(".github/workflows/specforge-ci.yml")).toBe("team");
  });

  // PRD-005 § 9 row 3.
  it("BUNDLE_ONLY_FILES entries are relative, `..`-free, and classify as unknown", () => {
    expect(BUNDLE_ONLY_FILES.length).toBeGreaterThan(0);
    for (const e of BUNDLE_ONLY_FILES) {
      expect(e.startsWith("/"), `${e} must be relative`).toBe(false);
      expect(path.isAbsolute(e), `${e} must be relative`).toBe(false);
      expect(e.includes(".."), `${e} must not contain ..`).toBe(false);
      expect(FRAMEWORK_FILES, `${e} must not also be a framework file`).not.toContain(e);
      // "unknown" specifically: `ignored` would also be "not framework", but
      // it would mean the entry escaped the bundle root.
      expect(classify(e), `${e} must classify as unknown`).toBe("unknown");
    }
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

  it("no path matches both FRAMEWORK_FILES and the team-data wildcard", () => {
    // The framework-over-team precedence in classify() exists for a
    // double-match; since PRD-005 no entry produces one. Every workflow file
    // is team data now.
    expect(classify(".github/workflows/my-ci.yml")).toBe("team");
    expect(classify(".github/workflows/cli-release.yml")).toBe("team");
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

// PRD-006 § 9 row 25. The two halves diverge deliberately. `classify` compares
// path strings with no case normalisation (`patternToRegex` builds no `i`
// flag), so a case-variant namespace falls to `unknown` — which fails safe for
// the erase path. The validator cannot afford the same divergence: a
// case-sensitive containment test would fire class 2 fourteen times on a
// correctly-installed APFS tree, and errors change `doctor`'s exit code.
describe("case-variant namespace: classify vs subagent-frontmatter", () => {
  it("classify leaves .claude/agents/SpecForge/ unknown (string-level, § 6.1)", () => {
    expect(classify(".claude/agents/SpecForge/x.md")).toBe("unknown");
  });

  it("subagent-frontmatter reports nothing for the 14 definitions under SpecForge/ (§ 5.4)", async () => {
    const dir = await mkTmpDir();
    try {
      await plantSubagentDefinitions(
        path.join(dir, ".claude", "agents", "SpecForge"),
      );
      expect(await subagentFrontmatter.run(dir)).toEqual([]);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});

// PRD-005 § 9 row 4. `listEraseTargets` is module-private to init.ts; the
// `--erase --dry-run` preview is its only observable surface, and it prints
// exactly the collected list.
describe("--force --erase deletion list", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkTmpDir();
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  async function plant(rel: string): Promise<void> {
    const abs = path.join(tmpDir, rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, "planted\n");
  }

  it("collects CLAUDE.md and the release workflow but none of the vacated paths", async () => {
    await plant("CLAUDE.md");
    await plant("CHANGELOG.md");
    await plant("docs/x.md");
    await plant("scripts/upgrade.sh");
    await plant(".github/workflows/cli-release.yml");

    const chunks: string[] = [];
    const origWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk: any) => {
      chunks.push(String(chunk));
      return true;
    };

    let exitCode: number;
    try {
      exitCode = await runInit({
        cwd: tmpDir,
        force: true,
        erase: true,
        noGitSafety: false,
        dryRun: true,
        quiet: false,
        importMetaUrl: synthBundleImportMetaUrl(),
      });
    } finally {
      process.stdout.write = origWrite;
    }
    expect(exitCode).toBe(0);

    const targets = chunks
      .join("")
      .split("\n")
      .map((l) => /^\s*delete\s+(.+?)\s*$/.exec(l)?.[1])
      .filter((t): t is string => t !== undefined);

    expect(targets).toContain("CLAUDE.md");
    // A workflow file in the team's own repository stays collectable — it is
    // team data now, not framework data.
    expect(targets).toContain(".github/workflows/cli-release.yml");
    for (const p of ["CHANGELOG.md", "docs/x.md", "scripts/upgrade.sh"]) {
      expect(targets, `${p} must no longer be an erase target`).not.toContain(p);
    }
  });
});
