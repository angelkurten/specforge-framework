// Rows #4 and #5: three-way merge
import { describe, it, expect } from "vitest";
import { threeWayMerge } from "../../src/merge.js";

describe("three-way diff happy path", () => {
  it("Given base, ours, theirs without overlapping hunks, diff3 produces a clean merge", () => {
    const base = "line1\nline2\nline3\n";
    const ours = "line1\nours-edit\nline3\n";    // changed line2
    const theirs = "line1\nline2\nline3\nline4\n"; // added line4

    const result = threeWayMerge(base, ours, theirs);
    expect(result.conflicted).toBe(false);
    expect(result.text).toContain("ours-edit");
    expect(result.text).toContain("line4");
    expect(result.text).not.toContain("<<<<<<<");
  });
});

describe("three-way diff conflict", () => {
  it("Overlapping hunks produce <<<<<<< markers and the file is reported as conflicting", () => {
    const base = "shared-line\n";
    const ours = "ours-changed-it\n";
    const theirs = "theirs-changed-it\n";

    const result = threeWayMerge(base, ours, theirs);
    expect(result.conflicted).toBe(true);
    expect(result.text).toContain("<<<<<<<");
    expect(result.text).toContain("=======");
    expect(result.text).toContain(">>>>>>>");
  });
});
