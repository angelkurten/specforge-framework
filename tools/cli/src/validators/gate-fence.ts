// Shared gate-block fence matcher.
//
// `.claude/rules/gate-block.md` § "Comment vocabulary" allows an HTML comment
// between the `## Gate:` heading and the ```yaml fence — that is where a step-9
// `not run` validation waiver and a waived finding are recorded — so the fence
// matcher must skip them. (The `# yellow-tracking:` and `# amendment:` lines go
// *inside* the fence, as YAML comments; a bare `#` line above it is forbidden
// precisely because this pattern does not admit one.) This lived as two
// byte-identical copies (gate-block-yaml, prd-system-artifact-diff) and both
// carried the same bug; it is one module now so the next fix lands once.

export const GATE_FENCE_RE =
  /^##\s+Gate:[^\n]*\n(?:\s*<!--[\s\S]*?-->)*\s*```yaml\n([\s\S]*?)\n```/m;

/** Returns the raw YAML body of a PRD's gate block, or null when absent. */
export function extractGateYaml(text: string): string | null {
  return GATE_FENCE_RE.exec(text)?.[1] ?? null;
}
