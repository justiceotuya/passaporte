import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { resolveContentDir } from "@/lib/content-dir";
import {
  convexGetUnit,
  convexListUnits,
} from "@/lib/convex-content";
import {
  getContentSource,
  type ContentSource,
} from "@/lib/convex-env";
import type { PassaporteUnit } from "@/types/item";

export type { ContentSource };

const CONTENT_DIR = resolveContentDir();

export type UnitSummary = {
  unit: number;
  title: string;
  topics: string[];
  itemCount: number;
  itemIds: string[];
};

export { getContentSource };

function loadUnitFromFs(unit: number): PassaporteUnit {
  const file = path.join(CONTENT_DIR, `u${String(unit).padStart(2, "0")}.json`);
  return JSON.parse(readFileSync(file, "utf8")) as PassaporteUnit;
}

function listUnitSummariesFromFs(): UnitSummary[] {
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

/** Load one unit (Convex or fs per CONTENT_SOURCE). */
export async function loadUnit(unit: number): Promise<PassaporteUnit> {
  if (getContentSource() === "convex") {
    const data = await convexGetUnit(unit);
    if (!data) {
      throw new Error(`Unit ${unit} not found in Convex`);
    }
    return data;
  }
  return loadUnitFromFs(unit);
}

/** Unit summaries for the map (Convex or fs per CONTENT_SOURCE). */
export async function listUnitSummaries(): Promise<UnitSummary[]> {
  if (getContentSource() === "convex") {
    const rows = await convexListUnits();
    if (!rows) {
      throw new Error("Convex content unavailable");
    }
    return rows;
  }
  return listUnitSummariesFromFs();
}
