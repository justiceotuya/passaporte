#!/usr/bin/env node
/**
 * Ship gate: every unit listed in content/shipped-units.json must have
 * 100% of closed items with review.status === "approved".
 */
import { readFileSync, existsSync } from "node:fs";
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
const manifestPath = path.join(root, "content/shipped-units.json");

if (!existsSync(manifestPath)) {
  console.log("No content/shipped-units.json — nothing to gate.");
  process.exit(0);
}

const shipped = JSON.parse(readFileSync(manifestPath, "utf8"));
if (!Array.isArray(shipped)) {
  console.error("shipped-units.json must be an array of paths like passaporte/u07");
  process.exit(1);
}

let failed = 0;
for (const entry of shipped) {
  const file = path.join(root, "content", `${entry}.json`);
  if (!existsSync(file)) {
    console.error(`FAIL missing shipped unit file: ${entry}`);
    failed += 1;
    continue;
  }
  const unit = JSON.parse(readFileSync(file, "utf8"));
  const closed = (unit.items ?? []).filter((item) => CLOSED.has(item.type));
  const unapproved = closed.filter(
    (item) => item.review?.status !== "approved",
  );
  if (closed.length === 0) {
    console.error(`FAIL ${entry}: no closed items to ship`);
    failed += 1;
    continue;
  }
  if (unapproved.length > 0) {
    console.error(
      `FAIL ${entry}: ${unapproved.length}/${closed.length} closed items not approved`,
    );
    for (const item of unapproved.slice(0, 5)) {
      console.error(`  - ${item.id} (${item.review?.status ?? "missing"})`);
    }
    failed += 1;
  } else {
    console.log(`OK   ${entry}: ${closed.length} closed items approved`);
  }
}

if (failed > 0) {
  console.error(`\nShip gate failed (${failed})`);
  process.exit(1);
}
console.log(`\nShip gate passed for ${shipped.length} unit(s)`);
