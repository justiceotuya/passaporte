#!/usr/bin/env node
/**
 * Approve all closed items in a unit file (local content ship helper).
 * Usage: node scripts/approve-unit.mjs passaporte/u07
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CLOSED = new Set([
  "choice",
  "fill_blank",
  "match",
  "order",
  "true_false",
  "transform",
  "listen_choice",
]);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const entry = process.argv[2];
if (!entry) {
  console.error("Usage: node scripts/approve-unit.mjs passaporte/u07");
  process.exit(1);
}

const file = path.join(root, "content", `${entry}.json`);
const unit = JSON.parse(readFileSync(file, "utf8"));
const at = new Date().toISOString();
let count = 0;
for (const item of unit.items) {
  if (!CLOSED.has(item.type)) continue;
  item.review = {
    status: "approved",
    by: "ship-smoke",
    at,
    notes: item.review?.notes,
  };
  count += 1;
}
writeFileSync(file, `${JSON.stringify(unit, null, 2)}\n`, "utf8");
console.log(`Approved ${count} closed items in ${entry}`);
