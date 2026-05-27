// Three-way merge for `update --strategy=merge` per PRD-003 § 5.2 / § 4.2.
//
// Uses the `diff3` npm package. Returns the merged text and a boolean
// indicating whether unresolved conflict markers were emitted.

// The `diff3` package exposes a `diff3Merge` function returning an array of
// blocks: either { ok: string[] } or { conflict: { a: string[], o: string[], b: string[] } }.

// eslint-disable-next-line @typescript-eslint/no-var-requires
import diff3Module from "diff3";

interface OkBlock { ok: string[] }
interface ConflictBlock { conflict: { a: string[]; o: string[]; b: string[] } }
type Block = OkBlock | ConflictBlock;

function callDiff3(
  a: string[],
  o: string[],
  b: string[],
): Block[] {
  // The diff3 package historically exports a function as default, but some
  // builds expose it as `.diff3Merge`. Handle both.
  const fn: any =
    (diff3Module as any).diff3Merge ??
    (diff3Module as any).default ??
    (diff3Module as any);
  if (typeof fn !== "function") {
    throw new Error("diff3 module did not export a callable merge function");
  }
  return fn(a, o, b) as Block[];
}

export interface MergeResult {
  /** Merged text (with conflict markers if any). */
  text: string;
  /** True iff at least one conflict block was emitted. */
  conflicted: boolean;
}

function splitLines(s: string): string[] {
  // Preserve trailing-newline behaviour: split, then track whether the input
  // ended with a newline. The diff3 library operates on arrays of lines
  // without their terminator.
  if (s.length === 0) return [];
  const parts = s.split("\n");
  // If the input ends with \n, split will produce a trailing empty string we
  // need to drop. We re-add the trailing newline at the end.
  if (parts.length > 0 && parts[parts.length - 1] === "") {
    parts.pop();
  }
  return parts;
}

/**
 * Three-way merge.
 *
 * @param base    the original framework file at install time
 * @param ours    the user's current file (with local edits)
 * @param theirs  the new framework file from the bundled tarball
 */
export function threeWayMerge(
  base: string,
  ours: string,
  theirs: string,
): MergeResult {
  const blocks = callDiff3(splitLines(ours), splitLines(base), splitLines(theirs));
  const out: string[] = [];
  let conflicted = false;

  for (const block of blocks) {
    if ("ok" in block) {
      for (const line of block.ok) out.push(line);
    } else {
      conflicted = true;
      out.push("<<<<<<< ours");
      for (const line of block.conflict.a) out.push(line);
      out.push("|||||||");
      for (const line of block.conflict.o) out.push(line);
      out.push("=======");
      for (const line of block.conflict.b) out.push(line);
      out.push(">>>>>>> theirs");
    }
  }

  return {
    text: out.join("\n") + "\n",
    conflicted,
  };
}
