// Registry of doctor validators in declaration order (PRD-003 § 7.4).

import { validator as manifestPresent } from "./manifest-present.js";
import { validator as frameworkFileIntegrity } from "./framework-file-integrity.js";
import { validator as prdNumbering } from "./prd-numbering.js";
import { validator as prdRequiredSections } from "./prd-required-sections.js";
import { validator as prdBackRefs } from "./prd-back-refs.js";
import { validator as prdMarketingLanguage } from "./prd-marketing-language.js";
import { validator as prdSystemArtifactDiff } from "./prd-system-artifact-diff.js";
import { validator as siblingsPathsResolve } from "./siblings-paths-resolve.js";
import { validator as gateBlockYaml } from "./gate-block-yaml.js";
import { validator as claudeMdSize } from "./claude-md-size.js";
import { validator as ruleFrontmatter } from "./rule-frontmatter.js";
import { validator as roadmapEvidenceCategories } from "./roadmap-evidence-categories.js";
import type { Validator } from "./types.js";

export const ALL_VALIDATORS: ReadonlyArray<Validator> = [
  manifestPresent,
  frameworkFileIntegrity,
  prdNumbering,
  prdRequiredSections,
  prdBackRefs,
  prdMarketingLanguage,
  prdSystemArtifactDiff,
  siblingsPathsResolve,
  gateBlockYaml,
  claudeMdSize,
  ruleFrontmatter,
  roadmapEvidenceCategories,
];

export const VALIDATOR_IDS: ReadonlyArray<string> = ALL_VALIDATORS.map(
  (v) => v.id,
);

export function findValidator(id: string): Validator | undefined {
  return ALL_VALIDATORS.find((v) => v.id === id);
}

export type { Validator, Finding, ValidatorOptions, Severity } from "./types.js";
