// SHA-256 with the PRD-003 § 7.3 canonicalisation pipeline.
// Pipeline: read bytes → strip leading UTF-8 BOM → collapse CRLF and bare CR
// to LF → ensure exactly one trailing LF → sha256(bytes).

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const BOM = Buffer.from([0xef, 0xbb, 0xbf]);

/**
 * Canonicalise raw bytes per § 7.3. Returns the canonicalised byte buffer.
 */
export function canonicalise(input: Buffer): Buffer {
  let buf = input;
  // 1. Strip leading UTF-8 BOM if present.
  if (buf.length >= 3 && buf[0] === BOM[0] && buf[1] === BOM[1] && buf[2] === BOM[2]) {
    buf = buf.subarray(3);
  }
  // 2. CRLF → LF and bare CR → LF.
  // Decoding to string and re-encoding is the simplest correct
  // implementation; we expect text (UTF-8) inputs only — § 7.3 states
  // binary entries would carry `canonicalise: false`, and there are none
  // in the partition at v0.7.0.
  let text = buf.toString("utf8");
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  // 3. Exactly one trailing LF.
  text = text.replace(/\n+$/, "");
  text += "\n";
  return Buffer.from(text, "utf8");
}

/**
 * Compute the canonical sha256 (lowercase hex) of raw bytes.
 */
export function sha256OfBytes(input: Buffer): string {
  const canonical = canonicalise(input);
  return createHash("sha256").update(canonical).digest("hex");
}

/**
 * Compute the canonical sha256 of a file on disk.
 */
export async function sha256OfFile(absPath: string): Promise<string> {
  const bytes = await readFile(absPath);
  return sha256OfBytes(bytes);
}
