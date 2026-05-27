// Safe YAML entry point per PRD-003 § 8.2. The wrapper enforces
// `customTags: []` so unknown tags (`!!js/function`, `!<tag:...>`) throw
// during parse instead of instantiating anything.
//
// Direct use of `yaml.parse` outside this module is forbidden — keep this
// file as the single YAML surface.

import { parseDocument } from "yaml";

export class UnsafeYamlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeYamlError";
  }
}

/**
 * Parse a YAML document. Throws on custom tags, warnings, or malformed
 * input. `customTags: []` prevents tag resolvers from instantiating
 * anything; `parseDocument` surfaces unresolved tags as `.warnings` which
 * we promote to fatal, honoring PRD § 8.2.
 */
export function parseYaml(text: string): unknown {
  let doc;
  try {
    doc = parseDocument(text, {
      customTags: [],
      strict: true,
      prettyErrors: true,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new UnsafeYamlError(`yaml parse failed: ${msg}`);
  }
  if (doc.errors.length > 0) {
    throw new UnsafeYamlError(
      `yaml parse failed: ${doc.errors.map((e) => e.message).join("; ")}`,
    );
  }
  if (doc.warnings.length > 0) {
    throw new UnsafeYamlError(
      `yaml parse rejected (custom tag or unresolved type): ${doc.warnings.map((w) => w.message).join("; ")}`,
    );
  }
  return doc.toJS();
}
