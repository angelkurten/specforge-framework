// doctor: manifest-present — the framework source repo is not an installation.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { mkTmpDir } from "../../helpers.js";
import { validator } from "../../../src/validators/manifest-present.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkTmpDir();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("doctor: manifest-present", () => {
  it("a layout with no manifest fails", async () => {
    const findings = await validator.run(tmpDir);
    expect(findings.some((f) => f.message.includes("manifest is missing"))).toBe(true);
  });

  it("the specforge source repo is exempt — it is not an installation", async () => {
    await fs.mkdir(path.join(tmpDir, "tools", "cli"), { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, "tools", "cli", "package.json"),
      JSON.stringify({ name: "@angelkurten/specforge" }),
    );
    expect(await validator.run(tmpDir)).toHaveLength(0);
  });

  it("an unrelated tools/cli/package.json does not grant the exemption", async () => {
    await fs.mkdir(path.join(tmpDir, "tools", "cli"), { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, "tools", "cli", "package.json"),
      JSON.stringify({ name: "some-other-cli" }),
    );
    expect(await validator.run(tmpDir)).not.toHaveLength(0);
  });
});
