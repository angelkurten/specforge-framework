// Registry of doctor validators in declaration order.

import { validator as manifestPresent } from "./manifest-present.js";
import { validator as frameworkFileIntegrity } from "./framework-file-integrity.js";
import { validator as claudeMdSize } from "./claude-md-size.js";
import { validator as ruleFrontmatter } from "./rule-frontmatter.js";
import { validator as staleBriefings } from "./stale-briefings.js";
import { validator as subagentFrontmatter } from "./subagent-frontmatter.js";
import { validator as lockGuardRegistered } from "./lock-guard-registered.js";
import type { Validator } from "./types.js";

export const ALL_VALIDATORS: ReadonlyArray<Validator> = [
  manifestPresent,
  frameworkFileIntegrity,
  claudeMdSize,
  ruleFrontmatter,
  staleBriefings,
  subagentFrontmatter,
  lockGuardRegistered,
];

export const VALIDATOR_IDS: ReadonlyArray<string> = ALL_VALIDATORS.map(
  (v) => v.id,
);

export function findValidator(id: string): Validator | undefined {
  return ALL_VALIDATORS.find((v) => v.id === id);
}

export type { Validator, Finding, ValidatorOptions, Severity } from "./types.js";
