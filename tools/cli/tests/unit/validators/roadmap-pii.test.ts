// doctor: roadmap-pii — the syntactic table in
// `.claude/rules/roadmap.md` § "Forbidden evidence (syntactic)".
// One case per row, plus the § Visibility severity switch and the
// false-positive guard that matters most (ISO dates are not phone numbers).
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { mkTmpDir } from "../../helpers.js";
import { validator } from "../../../src/validators/roadmap-pii.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkTmpDir();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

async function run(body: string, header = "") {
  const content = `# Roadmap\n${header}\n### ROADMAP-001\n\n**Evidence**:\n${body}\n`;
  await fs.writeFile(path.join(tmpDir, "ROADMAP.md"), content);
  return validator.run(tmpDir);
}

describe("doctor: roadmap-pii", () => {
  it("email inside a category-4 quote is an error in a public roadmap", async () => {
    const f = await run(`- "ping me at ada@example.com" — admin, 2026-03-18`);
    expect(f.some((x) => x.severity === "error" && x.message.includes("email"))).toBe(true);
  });

  it("Visibility: private downgrades the email finding to a warning", async () => {
    const f = await run(
      `- "ping me at ada@example.com" — admin, 2026-03-18`,
      "\n**Visibility**: private\n",
    );
    const email = f.filter((x) => x.message.includes("email"));
    expect(email).toHaveLength(1);
    expect(email[0]!.severity).toBe("warning");
  });

  it("Visibility defaults to public when the header is absent", async () => {
    const f = await run(`- "reach me at ada@example.com" — admin`);
    expect(f.find((x) => x.message.includes("email"))!.severity).toBe("error");
  });

  it("a phone-shaped digit run inside a quote is flagged", async () => {
    const f = await run(`- "call 555-867-5309 for context" — support, 2026-03-18`);
    expect(f.some((x) => x.message.includes("phone"))).toBe(true);
  });

  it("an ISO date inside a quote is NOT a phone number", async () => {
    const f = await run(`- "I can't find where to export" — admin, 2026-03-18`);
    expect(f.some((x) => x.message.includes("phone"))).toBe(false);
  });

  it("an @handle inside a quote is a warning", async () => {
    const f = await run(`- "as @adalovelace said" — community, 2026-03-18`);
    const h = f.filter((x) => x.message.includes("@handle"));
    expect(h).toHaveLength(1);
    expect(h[0]!.severity).toBe("warning");
  });

  it("name-shaped text inside a quote is a warning, not a blocker", async () => {
    const f = await run(`- "Ada Lovelace could not export" — support, 2026-03-18`);
    const n = f.filter((x) => x.message.includes("name-shaped"));
    expect(n).toHaveLength(1);
    expect(n[0]!.severity).toBe("warning");
  });

  it("a credential parameter in a category-5 URL is an error", async () => {
    const f = await run(`- https://competitor.example.com/x?access_token=abc123 captured 2026-04-01`);
    expect(f.some((x) => x.severity === "error" && x.message.includes("credential"))).toBe(true);
  });

  it("a category-5 URL on a configured internal domain is an error", async () => {
    const f = await run(
      `- https://wiki.internal.acme.test/page captured 2026-04-01`,
      "\n**Internal domains**: internal.acme.test\n",
    );
    expect(f.some((x) => x.severity === "error" && x.message.includes("internal domain"))).toBe(true);
  });

  it("an external URL is not flagged when an allowlist is configured", async () => {
    const f = await run(
      `- https://competitor.example.com/feature captured 2026-04-01`,
      "\n**Internal domains**: internal.acme.test\n",
    );
    expect(f).toHaveLength(0);
  });

  it("a category-4 entry spanning 3+ lines is a pasted-content blob", async () => {
    const f = await run(
      `- "first line of the dump" — admin, 2026-03-18\n  second line of pasted content\n  third line of pasted content`,
    );
    expect(f.some((x) => x.severity === "error" && x.message.includes("pasted content"))).toBe(true);
  });

  it("image markdown in evidence is an error", async () => {
    const f = await run(`- ![screenshot](./shot.png) captured 2026-04-01`);
    expect(f.some((x) => x.severity === "error" && x.message.includes("screenshot"))).toBe(true);
  });

  it("clean evidence produces no findings", async () => {
    const f = await run(`- SUPPORT-234, SUPPORT-441 filed against export`);
    expect(f).toHaveLength(0);
  });

  it("missing ROADMAP.md produces no findings", async () => {
    expect(await validator.run(tmpDir)).toHaveLength(0);
  });
});
