// Centralised stdout/stderr formatting. PRD-003 § 5.0.
//
// - --json suppresses ANSI colour.
// - NO_COLOR env var suppresses ANSI colour.
// - Non-TTY stdout suppresses ANSI colour.
// - Error messages always go to stderr with the
//   `error: ...\nremediation: ...` shape.

export interface IOOptions {
  json?: boolean;
  quiet: boolean;
}

export function shouldUseColor(json: boolean | undefined): boolean {
  if (json) return false;
  if (process.env.NO_COLOR !== undefined) return false;
  if (!process.stdout.isTTY) return false;
  return true;
}

export function info(opts: IOOptions, msg: string): void {
  if (opts.quiet) return;
  if (opts.json) return; // JSON callers get a single object at the end.
  process.stdout.write(msg + "\n");
}

export function summary(opts: IOOptions, msg: string): void {
  // Summary lines are always printed (per § 5.0), unless we are in JSON mode
  // where the JSON object IS the summary.
  if (opts.json) return;
  process.stdout.write(msg + "\n");
}

export function writeJson(obj: unknown): void {
  process.stdout.write(JSON.stringify(obj, null, 2) + "\n");
}

export interface CliError {
  message: string;
  remediation: string;
  exitCode: number;
}

export function printError(e: CliError): void {
  process.stderr.write(`error: ${e.message}\n`);
  process.stderr.write(`remediation: ${e.remediation}\n`);
}
