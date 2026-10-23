// specforge/changes/2026-10-23-specforge-namespace scenarios 1–3.
import { describe, it, expect } from "vitest";
import { classify } from "../../src/partition.js";

describe("partition: v2 lives under specforge/", () => {
  it("1. specforge/core, specforge/scripts, the guard and the specforge skills are framework", () => {
    for (const p of [
      "specforge/core/loop.md",
      "specforge/scripts/lock_tests.py",
      "specforge/scripts/loop.py",
      "specforge/scripts/review_prep.py",
      "specforge/scripts/archive.py",
      "specforge/scripts/compose_check.py",
      ".claude/hooks/specforge_lock_guard.py",
      ".claude/skills/specforge-loop/SKILL.md",
    ]) {
      expect(classify(p), p).toBe("framework");
    }
  });

  it("2. specforge/changes and specforge/DECISIONS.md are team data", () => {
    for (const p of [
      "specforge/changes/2026-10-23-demo/contract.md",
      "specforge/changes/archive/2026-10-23-demo/evidence.md",
      "specforge/DECISIONS.md",
    ]) {
      expect(classify(p), p).toBe("team");
    }
  });

  it("3. a project's own core/, scripts, changes/, DECISIONS.md, tests, skills, hooks and settings are neither", () => {
    for (const p of [
      "core/notes.md",
      "scripts/archive.py",
      "changes/2025-q3/release.md",
      "DECISIONS.md",
      "scripts/loop_test.py",
      ".claude/skills/my-skill/SKILL.md",
      ".claude/hooks/other.py",
      ".claude/settings.json",
    ]) {
      expect(["framework", "team"], p).not.toContain(classify(p));
    }
  });
});
