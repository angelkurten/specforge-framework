import { promises as fs } from "node:fs";
import * as path from "node:path";

import { manifestExists, readManifest, ManifestError } from "../manifest.js";
import type { Finding, Validator } from "./types.js";

export const id = "manifest-present";

/**
 * The specforge source repo is not an installation. A manifest records which
 * framework version was installed and its per-file sha256 at install time; in
 * the repo that ships the framework there is no installed version, the files
 * are the source. Demanding a manifest there is a category error, so doctor
 * skips this check when it recognises the source repo — narrowly, by the CLI
 * package that only this repo contains.
 */
async function isFrameworkSourceRepo(cwd: string): Promise<boolean> {
  try {
    const pkg = await fs.readFile(
      path.join(cwd, "tools", "cli", "package.json"),
      "utf8",
    );
    return JSON.parse(pkg)?.name === "@angelkurten/specforge";
  } catch {
    return false;
  }
}

export const validator: Validator = {
  id,
  async run(cwd: string): Promise<Finding[]> {
    if (await isFrameworkSourceRepo(cwd)) return [];
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
