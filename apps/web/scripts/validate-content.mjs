#!/usr/bin/env node
/**
 * Validate every content unit JSON file against schema/unit.schema.json.
 * Exit 1 on first failure.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const contentRoot = path.join(root, "content");

function walkJson(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walkJson(full, out);
    else if (/^u\d{2}\.json$/.test(name)) out.push(full);
  }
  return out;
}

const itemSchema = JSON.parse(
  readFileSync(path.join(root, "schema/item.schema.json"), "utf8"),
);
const unitSchema = JSON.parse(
  readFileSync(path.join(root, "schema/unit.schema.json"), "utf8"),
);

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
ajv.addSchema(itemSchema);
const validateUnit = ajv.compile(unitSchema);

const files = walkJson(contentRoot).sort();
if (files.length === 0) {
  console.error("No content JSON files found under content/");
  process.exit(1);
}

let failed = 0;
for (const file of files) {
  const data = JSON.parse(readFileSync(file, "utf8"));
  const ok = validateUnit(data);
  const rel = path.relative(root, file);
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${rel}`);
    console.error(JSON.stringify(validateUnit.errors, null, 2));
  } else {
    console.log(`OK   ${rel} (${data.items?.length ?? 0} items)`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} file(s) failed schema validation`);
  process.exit(1);
}
console.log(`\nValidated ${files.length} unit file(s)`);
