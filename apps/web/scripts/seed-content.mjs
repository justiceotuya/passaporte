#!/usr/bin/env node
/**
 * Idempotent JSON → Convex content seed.
 * Reads content/passaporte/uNN.json and calls content.seedUnitBundle.
 *
 * Env (apps/web/.env.local or process):
 *   NEXT_PUBLIC_CONVEX_URL  — Convex deployment URL
 *   CONTENT_SEED_SECRET     — must match `npx convex env set CONTENT_SEED_SECRET …`
 *
 * Usage:
 *   pnpm content:seed
 *   pnpm content:seed -- --unit=1
 *   pnpm content:seed -- --book=passaporte
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(webRoot, "../..");

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  for (const raw of readFileSync(filePath, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function parseArgs(argv) {
  let book = null;
  let unitFilter = null;
  for (const arg of argv) {
    if (arg === "--") continue;
    if (arg.startsWith("--book=")) {
      const value = arg.slice("--book=".length);
      if (value !== "passaporte" && value !== "valer" && value !== "sample") {
        throw new Error(
          `Invalid --book=${value} (expected passaporte|valer|sample)`,
        );
      }
      book = value;
    } else if (arg.startsWith("--unit=")) {
      const n = Number(arg.slice("--unit=".length));
      if (!Number.isInteger(n) || n < 1) {
        throw new Error(`Invalid --unit=${arg.slice("--unit=".length)}`);
      }
      unitFilter = n;
    } else if (arg === "--help" || arg === "-h") {
      console.log(
        `Usage: pnpm content:seed -- [--book=passaporte|valer|sample] [--unit=N]`,
      );
      process.exit(0);
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown flag: ${arg}`);
    }
  }
  return { book, unitFilter };
}

function hasUnits(dir) {
  return (
    existsSync(dir) &&
    readdirSync(dir).some((name) => /^u\d{2}\.json$/.test(name))
  );
}

function resolveSeedDir(book) {
  if (process.env.PASSAPORTE_CONTENT_DIR) {
    return path.resolve(repoRoot, process.env.PASSAPORTE_CONTENT_DIR);
  }
  if (book === "sample") {
    return path.join(repoRoot, "content", "sample");
  }
  if (book) {
    const localDir = path.join(repoRoot, "content", "local", book);
    if (hasUnits(localDir)) return localDir;
    return path.join(repoRoot, "content", book);
  }
  const localPassaporte = path.join(repoRoot, "content", "local", "passaporte");
  if (hasUnits(localPassaporte)) return localPassaporte;
  return path.join(repoRoot, "content", "sample");
}

function listUnitFiles(book) {
  const dir = resolveSeedDir(book);
  if (!existsSync(dir)) {
    throw new Error(`Content directory not found: ${dir}`);
  }
  return readdirSync(dir)
    .filter((name) => /^u\d{2}\.json$/.test(name))
    .sort()
    .map((name) => path.join(dir, name));
}

function normalizeItem(raw) {
  return {
    id: String(raw.id),
    book: raw.book,
    unit: Number(raw.unit),
    page: Number(raw.page),
    exercise: String(raw.exercise),
    type: raw.type,
    skill: raw.skill,
    topic: String(raw.topic),
    instruction: String(raw.instruction),
    instruction_en:
      raw.instruction_en === undefined || raw.instruction_en === null
        ? undefined
        : String(raw.instruction_en),
    prompt: String(raw.prompt),
    options: Array.isArray(raw.options) ? raw.options.map(String) : undefined,
    pairs: Array.isArray(raw.pairs) ? raw.pairs : undefined,
    sequence: Array.isArray(raw.sequence)
      ? raw.sequence.map(String)
      : undefined,
    answer: raw.answer,
    accepted: Array.isArray(raw.accepted) ? raw.accepted.map(String) : [],
    hint_en:
      raw.hint_en === undefined || raw.hint_en === null
        ? undefined
        : String(raw.hint_en),
    stimulus_image:
      raw.stimulus_image === undefined ? undefined : raw.stimulus_image,
    transcript:
      raw.transcript === undefined || raw.transcript === null
        ? undefined
        : String(raw.transcript),
    audio: raw.audio === undefined ? undefined : raw.audio,
    answer_source: raw.answer_source,
    review: raw.review,
  };
}

async function main() {
  loadEnvFile(path.join(webRoot, ".env.local"));
  loadEnvFile(path.join(repoRoot, ".env.local"));

  const { book, unitFilter } = parseArgs(process.argv.slice(2));
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  const secret = process.env.CONTENT_SEED_SECRET?.trim();

  if (!convexUrl) {
    console.error(
      "Missing NEXT_PUBLIC_CONVEX_URL (set in apps/web/.env.local)",
    );
    process.exit(1);
  }
  if (!secret) {
    console.error(
      [
        "Missing CONTENT_SEED_SECRET.",
        '1) pnpm --filter @passaporte/web exec convex env set CONTENT_SEED_SECRET "$(openssl rand -base64 32)"',
        "2) Add the same value to apps/web/.env.local as CONTENT_SEED_SECRET=…",
        "3) Push functions: pnpm --filter @passaporte/web exec convex dev --once",
      ].join("\n"),
    );
    process.exit(1);
  }

  let files = listUnitFiles(book);
  if (unitFilter !== null) {
    const needle = `u${String(unitFilter).padStart(2, "0")}.json`;
    files = files.filter((f) => path.basename(f) === needle);
    if (files.length === 0) {
      console.error(
        `No unit file for --unit=${unitFilter} under content/${book}`,
      );
      process.exit(1);
    }
  }

  if (files.length === 0) {
    console.error(`No unit JSON files under content/${book}`);
    process.exit(1);
  }

  const client = new ConvexHttpClient(convexUrl);
  let totalItems = 0;

  for (const file of files) {
    const data = JSON.parse(readFileSync(file, "utf8"));
    const items = (data.items ?? []).map((item) => normalizeItem(item));
    const payload = {
      secret,
      book: data.book ?? book ?? "passaporte",
      unit: data.unit,
      title: data.title,
      topics: data.topics ?? [],
      items,
    };

    const rel = path.relative(repoRoot, file);
    process.stdout.write(`Seeding ${rel} (${items.length} items)… `);
    try {
      const result = await client.mutation(api.content.seedUnitBundle, payload);
      totalItems += result.itemCount;
      console.log(`ok (itemCount=${result.itemCount})`);
    } catch (err) {
      console.log("FAIL");
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  }

  console.log(
    `\nSeeded ${files.length} unit(s), ${totalItems} item(s) → ${convexUrl}`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
