import { manifestExists, readManifest, ManifestError } from "../manifest.js";
import type { Finding, Validator } from "./types.js";

export const id = "manifest-present";

export const validator: Validator = {
  id,
  async run(cwd: string): Promise<Finding[]> {
    if (!(await manifestExists(cwd))) {
      return [
        {
          rule: id,
          severity: "error",
          file: ".specforge/manifest.json",
          message: "manifest is missing",
        },
      ];
    }
    try {
      await readManifest(cwd);
      return [];
    } catch (e) {
      if (e instanceof ManifestError) {
        return [
          {
            rule: id,
            severity: "error",
            file: ".specforge/manifest.json",
            message: e.message,
          },
        ];
      }
      throw e;
    }
  },
};

export const run = validator.run;
