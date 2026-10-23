// changes/2026-10-23-init-installs-v2 scenarios 1–3: what init owns in v2.
import { describe, it, expect } from "vitest";
import { classify } from "../../src/partition.js";

describe("partition: v2 files", () => {
  it("1. core, the five v2 scripts, the guard and the specforge skills are framework", () => {
    for (const p of [
      "core/loop.md",
      "scripts/lock_tests.py",
      "scripts/loop.py",
      "scripts/review_prep.py",
      "scripts/archive.py",
      "scripts/compose_check.py",
      ".claude/hooks/specforge_lock_guard.py",
      ".claude/skills/specforge-loop/SKILL.md",
    ]) {
      expect(classify(p), p).toBe("framework");
    }
  });

  it("2. change folders and the decision log are team data", () => {
    for (const p of [
      "changes/2026-10-23-demo/contract.md",
      "changes/archive/2026-10-23-demo/evidence.md",
      "DECISIONS.md",
    ]) {
      expect(classify(p), p).toBe("team");
    }
  });

  it("3. tests, other skills, other hooks and settings are not framework", () => {
    for (const p of [
      "scripts/loop_test.py",
      ".claude/skills/my-skill/SKILL.md",
      ".claude/hooks/other.py",
      ".claude/settings.json",
    ]) {
      expect(classify(p), p).not.toBe("framework");
    }
  });
});
