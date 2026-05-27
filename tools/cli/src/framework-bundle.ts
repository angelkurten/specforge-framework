// Helpers for working with the bundled framework tree shipped in
// `tools/cli/framework/`. The bundle is populated at publish time by
// `scripts/prepublish.ts` from the repo root.

import { promises as fs } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { classify } from "./partition.js";
import { sha256OfFile } from "./sha.js";

/**
 * Locate the `framework/` directory shipped alongside the compiled CLI.
 *
 * In a published install, the layout is:
 *   <pkg>/dist/cli.js          (this module)
 *   <pkg>/framework/...        (bundled tree)
 *
 * In a local dev tree it's:
 *   <repo>/tools/cli/dist/cli.js
 *   <repo>/tools/cli/framework/
 *
 * Both resolve to `../framework` relative to `dist/`.
 */
export function bundleRoot(importMetaUrl: string): string {
  const here = path.dirname(fileURLToPath(importMetaUrl));
  // `here` is `<pkg>/dist`. Bundle is `<pkg>/framework`.
  return path.resolve(here, "..", "framework");
}

/**
 * Read the bundled VERSION file. Throws if the bundle is missing.
 */
export async function bundleVersion(importMetaUrl: string): Promise<string> {
  const root = bundleRoot(importMetaUrl);
  const v = await fs.readFile(path.join(root, "VERSION"), "utf8");
  return v.trim();
}

/**
 * Recursively walk the bundle and return every regular file as a
 * repo-root-relative POSIX path.
 */
export async function walkBundle(
  importMetaUrl: string,
): Promise<string[]> {
  const root = bundleRoot(importMetaUrl);
  const out: string[] = [];

  async function walk(abs: string, rel: string): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(abs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const childAbs = path.join(abs, e.name);
      const childRel = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        await walk(childAbs, childRel);
      } else if (e.isFile()) {
        out.push(childRel);
      }
    }
  }

  await walk(root, "");
  out.sort();
  return out;
}

/**
 * Return only the bundle files that classify as "framework" — defensive
 * filter; the prepublish step should already have respected the partition.
 */
export async function listBundledFrameworkFiles(
  importMetaUrl: string,
): Promise<string[]> {
  const all = await walkBundle(importMetaUrl);
  return all.filter((p) => classify(p) === "framework");
}

/**
 * Resolve a bundle-relative path to its absolute on-disk location.
 */
export function bundleFileAbs(importMetaUrl: string, rel: string): string {
  return path.join(bundleRoot(importMetaUrl), rel);
}

/**
 * Compute canonical sha256 for every framework file in the bundle.
 * Returns a Map<rel, sha256-hex>.
 */
export async function hashBundle(
  importMetaUrl: string,
): Promise<Map<string, string>> {
  const files = await listBundledFrameworkFiles(importMetaUrl);
  const out = new Map<string, string>();
  for (const rel of files) {
    out.set(rel, await sha256OfFile(bundleFileAbs(importMetaUrl, rel)));
  }
  return out;
}
