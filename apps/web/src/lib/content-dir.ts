import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * Where unit JSON files are read from.
 *
 * 1. `PASSAPORTE_CONTENT_DIR` (absolute, or relative to the repo root)
 * 2. `content/local/passaporte` — your own pipeline output (gitignored,
 *    never committed: textbook content stays on your machine)
 * 3. `content/sample` — original demo units shipped with the repo
 */
const REPO_ROOT = path.join(process.cwd(), "../..");

function hasUnits(dir: string): boolean {
  return (
    existsSync(dir) && readdirSync(dir).some((name) => /^u\d{2}\.json$/.test(name))
  );
}

export function resolveContentDir(): string {
  const fromEnv = process.env.PASSAPORTE_CONTENT_DIR;
  if (fromEnv) return path.resolve(REPO_ROOT, fromEnv);

  const local = path.join(REPO_ROOT, "content/local/passaporte");
  if (hasUnits(local)) return local;

  return path.join(REPO_ROOT, "content/sample");
}
