// parseYaml refuses executable tags. Scenario 6 of
// specforge/changes/2026-11-02-v1-out-of-the-cli/contract.md; it moved here from
// the retired gate-block validator test.
import { describe, it, expect } from "vitest";
import { parseYaml, UnsafeYamlError } from "../../src/yaml.js";

describe("parseYaml", () => {
  it("6 throws UnsafeYamlError on !!js/function without running it", () => {
    const g = globalThis as { __specforgeRan?: boolean };
    delete g.__specforgeRan;
    const text = `tests:\n  - !!js/function "function(){ globalThis.__specforgeRan = true; return 42; }"\n`;
    // Fails against a loader that accepts the tag, or one that reports it some other way.
    expect(() => parseYaml(text)).toThrow(UnsafeYamlError);
    expect(g.__specforgeRan).toBeUndefined();
  });
});
