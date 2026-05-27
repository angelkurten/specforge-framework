// Minimal ambient declaration for the untyped `diff3` npm package.
declare module "diff3" {
  type Block =
    | { ok: string[] }
    | { conflict: { a: string[]; o: string[]; b: string[] } };

  function diff3Merge(a: string[], o: string[], b: string[]): Block[];
  export default diff3Merge;
  export { diff3Merge };
}
