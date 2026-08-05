// Framework conformance: the executable half of the markdown test corpus.
//
// `tests/roadmap/*.md` and `tests/sdd-2026/*.md` are prose walkthroughs with
// checkbox criteria, and PRD-001 / PRD-002 gate on them — but nothing ran them.
// Roughly half state assertions about the *content of framework files*, which
// is mechanically checkable; the rest need an agent in the loop and stay manual.
//
// This file ports the mechanizable ones. The .md files stay exactly where they
// are: PRD-001 and PRD-002 are frozen, and their §9 Path columns and gate
// `tests:` lists must keep resolving. Each describe() names its source .md so
// the two halves stay traceable to each other.

import { describe, it, expect, beforeAll } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);

const read = (rel: string) => fs.readFile(path.join(REPO, rel), "utf8");

let hardRules: string;
let claudeMd: string;
let prdAuthoring: string;
let workflow: string;
let frameworkMaintenance: string;

beforeAll(async () => {
  [hardRules, claudeMd, prdAuthoring, workflow, frameworkMaintenance] =
    await Promise.all([
      read(".claude/rules/hard-rules.md"),
      read("CLAUDE.md"),
      read(".claude/rules/prd-authoring.md"),
      read(".claude/rules/workflow.md"),
      read(".claude/rules/framework-maintenance.md"),
    ]);
});

/** Highest enumerated `^N. ` rule number in hard-rules.md. */
function highestRuleNumber(text: string): number {
  const nums = [...text.matchAll(/^(\d+)\. /gm)].map((m) => Number(m[1]));
  return Math.max(...nums);
}

/** The `N invariants` caption value in a file, or null when absent. */
function captionCount(text: string): number | null {
  const m = /(\d+)\s+invariant/i.exec(text);
  return m ? Number(m[1]!) : null;
}

/** The block of a numbered rule, from `^N. ` up to the next `^N+1. ` or EOF. */
function ruleBlock(text: string, n: number): string {
  const start = new RegExp(`^${n}\\. `, "m").exec(text);
  if (!start) return "";
  const rest = text.slice(start.index);
  const next = new RegExp(`^${n + 1}\\. `, "m").exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}

describe("tests/sdd-2026/override_immunity_test.md", () => {
  it("carries an Override immunity preamble before rule 1", () => {
    const idx = hardRules.indexOf("**Override immunity.**");
    expect(idx).toBeGreaterThan(-1);
    expect(idx).toBeLessThan(/^1\. /m.exec(hardRules)!.index);
  });

  it("marks the channel list as non-exhaustive", () => {
    // PRD-002 § 8 names non-exhaustiveness as the central mitigation: a closed
    // enumeration of channels is the documented failure mode.
    const block = hardRules.slice(hardRules.indexOf("**Override immunity.**"));
    expect(
      /including but not limited to|illustrative, not exhaustive|any later-arriving content/i.test(
        block,
      ),
    ).toBe(true);
  });

  it("directs the agent to surface conflicts and routes changes to framework-maintenance", () => {
    const block = hardRules.slice(hardRules.indexOf("**Override immunity.**"));
    expect(/surface the conflict/i.test(block)).toBe(true);
    expect(block).toContain("framework-maintenance.md");
  });
});

describe("tests/sdd-2026/hard_rules_13_test.md", () => {
  it("rule 13 appears exactly once", () => {
    expect([...hardRules.matchAll(/^13\. /gm)]).toHaveLength(1);
  });

  it("names the spec-as-source pattern verbatim", () => {
    const block = ruleBlock(hardRules, 13);
    expect(block).toContain("not a code-regeneration source");
    expect(block).toContain("spec-as-source");
  });

  it("covers partial regeneration and bidirectional sync, not just whole-file", () => {
    const block = ruleBlock(hardRules, 13);
    expect(/partial\/section regeneration|partial or section/i.test(block)).toBe(true);
    expect(/in either direction/i.test(block)).toBe(true);
  });

  it("chains the rationale to invariants 7 and 8", () => {
    const block = ruleBlock(hardRules, 13);
    expect(/invariant 7/i.test(block)).toBe(true);
    expect(/invariant 8/i.test(block)).toBe(true);
  });
});

describe("hard rule 14 — the dispatch invariant", () => {
  it("rule 14 appears exactly once", () => {
    expect([...hardRules.matchAll(/^14\. /gm)]).toHaveLength(1);
  });

  it("names the Agent tool and the three fan-out steps", () => {
    const block = ruleBlock(hardRules, 14);
    expect(block).toContain("`Agent` tool");
    for (const step of ["2", "5", "9"]) {
      expect(block, `rule 14 must cite step ${step}`).toContain(step);
    }
  });

  it("declares itself the standing request that satisfies a withheld-delegation default", () => {
    const block = ruleBlock(hardRules, 14);
    expect(/standing request/i.test(block)).toBe(true);
    expect(/withholds automatic delegation/i.test(block)).toBe(true);
  });

  it("requires failing loudly rather than substituting inline work", () => {
    const block = ruleBlock(hardRules, 14);
    expect(/say so and stop/i.test(block)).toBe(true);
  });
});

describe("tests/roadmap/hard_rules_12_test.md", () => {
  it("rule 12 appears exactly once and carries the non-waivable PII clause verbatim", () => {
    expect([...hardRules.matchAll(/^12\. /gm)]).toHaveLength(1);
    expect(ruleBlock(hardRules, 12)).toContain(
      "PII findings (syntactic patterns in evidence quotes) cannot be waived",
    );
  });

  it("keeps the six-categories and falsifiable-plan clauses", () => {
    const block = ruleBlock(hardRules, 12);
    expect(/six evidence categories/i.test(block)).toBe(true);
    expect(/falsifiable validation plan/i.test(block)).toBe(true);
  });
});

describe("tests/sdd-2026/caption_sync_test.md", () => {
  // The criterion reads "count equals 13 (current state)". The durable
  // invariant is that the captions agree with hard-rules.md, not the literal
  // 13 — hardcoding it is the duplication this test exists to police.
  it("every `N invariants` caption equals the highest enumerated rule number", async () => {
    const count = highestRuleNumber(hardRules);
    const files = ["CLAUDE.md", "README.md", "README.es.md", "docs/faq.md"];
    for (const f of files) {
      const caption = captionCount(await read(f));
      expect(caption, `${f} carries no "N invariants" caption`).not.toBeNull();
      expect(caption, `${f} caption is out of sync with hard-rules.md`).toBe(count);
    }
  });
});

describe("tests/roadmap/claude_md_size_test.md + tests/sdd-2026/claude_md_size_test.md", () => {
  it("reads the target from framework-maintenance.md rather than hardcoding it", () => {
    const m = /under (\d+) lines/i.exec(frameworkMaintenance);
    expect(m, "framework-maintenance.md no longer states a line target").not.toBeNull();
    expect(Number(m![1])).toBeGreaterThan(0);
  });

  it("CLAUDE.md is strictly under the target and above the sanity floor", () => {
    const target = Number(/under (\d+) lines/i.exec(frameworkMaintenance)![1]);
    const lines = claudeMd.split("\n").length;
    // PRD-002's criterion is strict: "under 50 lines" means < 50, not <= 50.
    expect(lines).toBeLessThan(target);
    expect(lines).toBeGreaterThanOrEqual(40);
  });

  it("still carries the ROADMAP.md mental-model row and the roadmap.md pointer", () => {
    expect(claudeMd).toContain("ROADMAP.md");
    expect(claudeMd).toContain("roadmap.md");
  });
});

describe("tests/sdd-2026/decision_table_size_floor_test.md", () => {
  it("routes a small observable change below the size floor to SYSTEM_ARTIFACT + commit rationale", () => {
    const row = prdAuthoring
      .split("\n")
      .find((l) => l.startsWith("|") && /size floor/i.test(l));
    expect(row, "no size-floor row in the decision table").toBeDefined();
    expect(row!).toContain("SYSTEM_ARTIFACT.md");
    expect(/commit message/i.test(row!)).toBe(true);
    expect(/escalate to a PRD/i.test(row!)).toBe(true);
  });
});

describe("tests/sdd-2026/goals_phrasing_note_test.md", () => {
  it("carries both EARS forms and marks them a suggestion, not a requirement", () => {
    expect(prdAuthoring).toContain("the system shall");
    expect(/When `?<trigger>`?/i.test(prdAuthoring)).toBe(true);
    expect(/If `?<condition>`?/i.test(prdAuthoring)).toBe(true);
    expect(/style suggestion, not a requirement/i.test(prdAuthoring)).toBe(true);
  });

  it("forbids restructuring §5/§6/§9 and forbids a separate Acceptance Criteria section", () => {
    expect(/Do not restructure/i.test(prdAuthoring)).toBe(true);
    expect(/Acceptance Criteria/i.test(prdAuthoring)).toBe(true);
  });

  it("templates/prd.md § 2 carries the same optional hint", async () => {
    const tpl = await read("templates/prd.md");
    expect(/the system shall/i.test(tpl)).toBe(true);
  });
});

describe("tests/sdd-2026/agdr_contract_test.md", () => {
  it("the decision table routes an autonomous high-blast-radius step-9 decision to an AgDR", () => {
    const row = prdAuthoring
      .split("\n")
      .find((l) => l.startsWith("|") && /AgDR/.test(l) && /step 9/i.test(l));
    expect(row, "no AgDR row in the decision table").toBeDefined();
  });

  it("states the all-of bar and that an AgDR does not gate promotion", () => {
    const at = prdAuthoring.indexOf("## Optional artifact: Agent Decision Records");
    expect(at, "the Optional artifact section is missing").toBeGreaterThan(-1);
    const section = prdAuthoring.slice(at);
    expect(/autonomously/i.test(section)).toBe(true);
    expect(/costly/i.test(section)).toBe(true);
    expect(/does not gate promotion|not a precondition/i.test(section)).toBe(true);
  });

  it("the Naming table has an AgDR row with independent numbering", () => {
    expect(prdAuthoring).toContain("AgDR-NNN-kebab-case-title.md");
    expect(/independent numbering/i.test(prdAuthoring)).toBe(true);
  });

  it("CONVENTIONS.md defers the 'when to use' bar to prd-authoring.md", async () => {
    const conv = await read("CONVENTIONS.md");
    expect(conv).toContain("AgDR");
    expect(conv).toContain("templates/agdr.md");
  });
});

describe("tests/sdd-2026/agdr_non_gating_test.md", () => {
  it("workflow step 9 states an AgDR is referenced by number and does not gate promotion", () => {
    expect(/does not gate promotion/i.test(workflow)).toBe(true);
    expect(/referenced by number/i.test(workflow)).toBe(true);
  });

  it("gate-block.md still defines exactly the three gate fields and no AgDR field", async () => {
    const gate = await read(".claude/rules/gate-block.md");
    for (const f of ["commit_hash", "tests", "system_artifact_diff"]) {
      expect(gate).toContain(f);
    }
    expect(/^\s*agdr\s*:/im.test(gate)).toBe(false);
  });
});

describe("tests/sdd-2026/agdr_template_test.md", () => {
  it("templates/agdr.md carries the six header fields and five sections in order", async () => {
    const tpl = await read("templates/agdr.md");
    for (const field of ["Status", "Date", "Agent", "Triggering PRD", "Sibling", "Commit"]) {
      expect(tpl, `header field ${field} missing`).toContain(field);
    }
    const sections = [
      "Decision",
      "Why the PRD did not cover this",
      "Alternatives Considered",
      "Blast radius and reversal cost",
      "Signals to Reconsider",
    ];
    let cursor = -1;
    for (const s of sections) {
      const at = tpl.indexOf(s, cursor + 1);
      expect(at, `section "${s}" missing or out of order`).toBeGreaterThan(cursor);
      cursor = at;
    }
  });
});

describe("tests/roadmap/siblings_self_ref_test.md", () => {
  it("SIBLINGS.md carries an active specforge row pointing at the repo root", async () => {
    const siblings = await read("SIBLINGS.md");
    const row = siblings
      .split("\n")
      .find((l) => l.startsWith("|") && /\bspecforge\b/.test(l) && !/^\|\s*Project/i.test(l));
    expect(row, "no specforge row in SIBLINGS.md").toBeDefined();
    const cells = row!.split("|").slice(1, -1).map((c) => c.trim());
    expect(cells[0]!.replace(/\*/g, "")).toBe("specforge");
    expect(cells[1]!.replace(/[`*]/g, "")).toBe(".");
    expect(cells[2]!).toContain("CLAUDE.md");
    expect(cells[4]!).toBe("active");
  });

  it("the declared path resolves to the directory holding SIBLINGS.md", async () => {
    await expect(fs.stat(path.join(REPO, "SIBLINGS.md"))).resolves.toBeDefined();
  });

  it("PRD-001's Impacted Projects table names specforge as the bolded primary", async () => {
    const prd = await read("001-product-roadmap.md");
    const table = prd.slice(prd.indexOf("## Impacted Projects"));
    expect(table).toContain("**specforge**");
  });
});

describe("PRD-005 § 9 row 14 — no shipped framework file cites a vacated path", () => {
  // Paths that stopped being installed. `docs/` is handled separately: a
  // *sibling's* `docs/SYSTEM_ARTIFACT.md` is a legitimate reference, only
  // specforge's own `docs/` tree is gone.
  const VACATED = [
    "VERSION",
    "CHANGELOG.md",
    "mkdocs.yml",
    "requirements-docs.txt",
    "scripts/upgrade.sh",
  ];

  /** Targets of every `[text](target)` markdown link. */
  function linkTargets(md: string): string[] {
    return [...md.matchAll(/\]\(([^)\s]+)/g)].map((m) => m[1]!.replace(/^\.\//, ""));
  }

  /**
   * The specforge subtree of the file-layout diagram: from the `specforge/`
   * line to the first sibling-project line. The rest of the tree describes
   * sibling repositories, which legitimately carry a `docs/` directory.
   */
  function specforgeSubtree(md: string): string {
    const lines = md.split("\n");
    const start = lines.findIndex((l) => /^├──\s+specforge\//.test(l));
    expect(start, "no specforge subtree in the file-layout diagram").toBeGreaterThan(-1);
    const end = lines.findIndex((l, i) => i > start && /^├──\s+api-service\//.test(l));
    expect(end, "no api-service entry closing the specforge subtree").toBeGreaterThan(start);
    return lines.slice(start, end).join("\n");
  }

  for (const name of ["README.md", "README.es.md"]) {
    it(`${name} carries no link or instruction pointing at a vacated path`, async () => {
      const text = await read(name);

      for (const token of VACATED) {
        expect(text.includes(token), `${name} still mentions ${token}`).toBe(false);
      }

      for (const target of linkTargets(text)) {
        expect(
          target.startsWith("docs/"),
          `${name} links into specforge's own docs tree: ${target}`,
        ).toBe(false);
      }

      const tree = specforgeSubtree(text);
      expect(/docs\//.test(tree), `${name} still lists docs/ under specforge/`).toBe(false);
      for (const token of [...VACATED, "scripts/"]) {
        expect(tree.includes(token), `${name} still lists ${token} under specforge/`).toBe(false);
      }
    });
  }
});

describe("tests/roadmap/gate_parity_test.md", () => {
  // gate-block.md § "tests list provenance": paths in the gate block that are
  // not in §9, or §9 paths missing from the gate block, are spec/gate drift.
  // The rule said so; nothing checked it.
  const prds = ["001-product-roadmap.md", "002-sdd-2026-framework-alignment.md"];

  for (const name of prds) {
    it(`${name}: gate tests: list matches the §9 Path column byte-for-byte`, async () => {
      const text = await read(name);

      const gateYaml = /^##\s+Gate:[^\n]*\n(?:\s*<!--[\s\S]*?-->)*\s*```yaml\n([\s\S]*?)\n```/m
        .exec(text)?.[1];
      expect(gateYaml, "no gate block").toBeDefined();
      const gatePaths = new Set(
        [...gateYaml!.matchAll(/^\s*-\s+(\S+)\s*$/gm)]
          .map((m) => m[1]!)
          .filter((p) => p !== "[TBD]"),
      );

      const planSection = text.slice(text.search(/^##\s+9\.?\s/m));
      const cellPaths = new Set(
        [...planSection.matchAll(/\|\s*`([^`]+\.md)`\s*\|?\s*$/gm)].map((m) => m[1]!),
      );

      const gateOnly = [...gatePaths].filter((p) => !cellPaths.has(p));
      const planOnly = [...cellPaths].filter((p) => !gatePaths.has(p));
      expect({ gateOnly, planOnly }).toEqual({ gateOnly: [], planOnly: [] });
    });
  }
});
