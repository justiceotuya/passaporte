import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { resolveContentDir } from "@/lib/content-dir";
import type { PassaporteUnit } from "@/types/item";

const CONTENT_DIR = resolveContentDir();

export type UnitSummary = {
  unit: number;
  title: string;
  topics: string[];
  itemCount: number;
  itemIds: string[];
};

export function loadUnit(unit: number): PassaporteUnit {
  const file = path.join(CONTENT_DIR, `u${String(unit).padStart(2, "0")}.json`);
  return JSON.parse(readFileSync(file, "utf8")) as PassaporteUnit;
}

export function listUnitSummaries(): UnitSummary[] {
  const files = readdirSync(CONTENT_DIR)
    .filter((name) => /^u\d{2}\.json$/.test(name))
    .sort();

  return files.map((name) => {
    const data = JSON.parse(
      readFileSync(path.join(CONTENT_DIR, name), "utf8"),
    ) as PassaporteUnit;
    return {
      unit: data.unit,
      title: data.title,
      topics: data.topics ?? [],
      itemCount: data.items.length,
      itemIds: data.items.map((item) => item.id),
    };
  });
}
