import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import type { PassaporteItem, PassaporteUnit } from "../src/types/item";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const itemSchema = JSON.parse(
  readFileSync(path.join(root, "schema/item.schema.json"), "utf8"),
);
const unitSchema = JSON.parse(
  readFileSync(path.join(root, "schema/unit.schema.json"), "utf8"),
);
const fixture = JSON.parse(
  readFileSync(path.join(root, "content/sample/u01.json"), "utf8"),
) as PassaporteUnit;

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
ajv.addSchema(itemSchema);
const validateItem = ajv.compile(itemSchema);
const validateUnit = ajv.compile(unitSchema);

describe("schema contract", () => {
  it("validates fixture unit against unit.schema.json", () => {
    const ok = validateUnit(fixture);
    expect(ok, JSON.stringify(validateUnit.errors, null, 2)).toBe(true);
  });

  it("validates every fixture item against item.schema.json", () => {
    for (const item of fixture.items) {
      const ok = validateItem(item);
      expect(ok, `${item.id}: ${JSON.stringify(validateItem.errors)}`).toBe(true);
    }
  });

  it("fixture has enough items for a session", () => {
    expect(fixture.items.length).toBeGreaterThanOrEqual(15);
  });

  it("rejects missing id", () => {
    const item = { ...fixture.items[0] } as Partial<PassaporteItem>;
    delete item.id;
    expect(validateItem(item)).toBe(false);
  });

  it("rejects bad type enum", () => {
    const item = { ...fixture.items[0], type: "essay" };
    expect(validateItem(item)).toBe(false);
  });

  it("rejects empty prompt", () => {
    const item = { ...fixture.items[0], prompt: "" };
    expect(validateItem(item)).toBe(false);
  });

  it("rejects closed item without hint_en", () => {
    const { hint_en: _removed, ...rest } = fixture.items[0];
    expect(validateItem(rest)).toBe(false);
  });

  it("rejects choice without options", () => {
    const choice = fixture.items.find((i) => i.type === "choice")!;
    const { options: _o, ...rest } = choice;
    expect(validateItem(rest)).toBe(false);
  });

  it("rejects true_false with non boolean-string answer", () => {
    const tf = fixture.items.find((i) => i.type === "true_false")!;
    expect(validateItem({ ...tf, answer: "yes" })).toBe(false);
  });

  it("TypeScript PassaporteUnit accepts the fixture shape", () => {
    const unit: PassaporteUnit = fixture;
    expect(unit.book).toBe("sample");
  });
});
