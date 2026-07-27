// Shared gate-block fence matcher.
//
// `.claude/rules/gate-block.md` § "🟡 closure requires a concrete artifact"
// *requires* a yellow-tracking comment above the block, so the fence matcher
// must skip HTML comments between the heading and the ```yaml fence. This
// lived as two byte-identical copies (gate-block-yaml, prd-system-artifact-diff)
// and both carried the same bug; it is one module now so the next fix lands once.

export const GATE_FENCE_RE =
  /^##\s+Gate:[^\n]*\n(?:\s*<!--[\s\S]*?-->)*\s*```yaml\n([\s\S]*?)\n```/m;

/** Returns the raw YAML body of a PRD's gate block, or null when absent. */
export function extractGateYaml(text: string): string | null {
  return GATE_FENCE_RE.exec(text)?.[1] ?? null;
}
