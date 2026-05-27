// Row #2 and #49: sha256 canonicalisation and BOM/trailing-newline tests
import { describe, it, expect } from "vitest";
import { sha256OfBytes, canonicalise } from "../../src/sha.js";

describe("sha256 canonicalisation", () => {
  it("LF vs CRLF endings produce the same sha256", () => {
    const lf = Buffer.from("hello\nworld\n", "utf8");
    const crlf = Buffer.from("hello\r\nworld\r\n", "utf8");
    expect(sha256OfBytes(lf)).toBe(sha256OfBytes(crlf));
  });

  it("bare CR is treated as LF", () => {
    const lf = Buffer.from("hello\nworld\n", "utf8");
    const cr = Buffer.from("hello\rworld\r", "utf8");
    expect(sha256OfBytes(lf)).toBe(sha256OfBytes(cr));
  });
});

describe("sha256: BOM and trailing-newline canonicalisation", () => {
  it("files with and without leading UTF-8 BOM hash to the same value", () => {
    const content = "# Test\nsome content\n";
    const plain = Buffer.from(content, "utf8");
    const withBom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), plain]);
    expect(sha256OfBytes(plain)).toBe(sha256OfBytes(withBom));
  });

  it("CRLF and LF produce the same hash", () => {
    const lf = Buffer.from("line one\nline two\n", "utf8");
    const crlf = Buffer.from("line one\r\nline two\r\n", "utf8");
    expect(sha256OfBytes(lf)).toBe(sha256OfBytes(crlf));
  });

  it("zero, one, or two trailing newlines all produce the same hash", () => {
    const noTrail = Buffer.from("content", "utf8");
    const oneTrail = Buffer.from("content\n", "utf8");
    const twoTrail = Buffer.from("content\n\n", "utf8");
    expect(sha256OfBytes(noTrail)).toBe(sha256OfBytes(oneTrail));
    expect(sha256OfBytes(oneTrail)).toBe(sha256OfBytes(twoTrail));
  });

  it("files differing in content (not just formatting) hash differently", () => {
    const a = Buffer.from("content A\n", "utf8");
    const b = Buffer.from("content B\n", "utf8");
    expect(sha256OfBytes(a)).not.toBe(sha256OfBytes(b));
  });

  it("BOM + CRLF + multiple trailing newlines produce same hash as plain LF", () => {
    const bom = Buffer.from([0xef, 0xbb, 0xbf]);
    const content = "hello\r\nworld\r\n\r\n";
    const combined = Buffer.concat([bom, Buffer.from(content, "utf8")]);
    const plain = Buffer.from("hello\nworld\n", "utf8");
    expect(sha256OfBytes(combined)).toBe(sha256OfBytes(plain));
  });

  it("canonicalise strips BOM", () => {
    const bom = Buffer.from([0xef, 0xbb, 0xbf]);
    const content = Buffer.from("hello\n", "utf8");
    const withBom = Buffer.concat([bom, content]);
    const result = canonicalise(withBom);
    expect(result[0]).not.toBe(0xef);
  });

  it("canonicalise ensures exactly one trailing LF", () => {
    const none = canonicalise(Buffer.from("hello", "utf8"));
    expect(none.toString("utf8").endsWith("\n")).toBe(true);
    expect(none.toString("utf8").endsWith("\n\n")).toBe(false);

    const two = canonicalise(Buffer.from("hello\n\n\n", "utf8"));
    expect(two.toString("utf8").endsWith("\n")).toBe(true);
    expect(two.toString("utf8").endsWith("\n\n")).toBe(false);
  });
});
