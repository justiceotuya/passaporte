import type { PassaporteItem } from "@/types/item";

export type InstructionLanguage = "en" | "pt";

/** Prefer English when requested and available; never return an empty string. */
export function instructionForDisplay(
  item: Pick<PassaporteItem, "instruction" | "instruction_en">,
  language: InstructionLanguage,
): string {
  if (language === "en") {
    const english = item.instruction_en?.trim();
    if (english) return english;
  }
  return item.instruction;
}
