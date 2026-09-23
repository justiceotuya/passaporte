import { describe, expect, it } from "vitest";
import { instructionForDisplay } from "@/lib/instruction-display";
import { useProgressStore } from "@/lib/progress-store";

describe("instructionForDisplay", () => {
  const item = {
    instruction: "Escolha a opção correta.",
    instruction_en: "Choose the correct option.",
  };

  it("prefers English when language is en and translation exists", () => {
    expect(instructionForDisplay(item, "en")).toBe("Choose the correct option.");
  });

  it("falls back to Portuguese when English is missing", () => {
    expect(
      instructionForDisplay({ instruction: "Escolha a opção correta." }, "en"),
    ).toBe("Escolha a opção correta.");
  });

  it("uses Portuguese when language is pt", () => {
    expect(instructionForDisplay(item, "pt")).toBe("Escolha a opção correta.");
  });
});

describe("instructionLanguage setting", () => {
  it("defaults instructionLanguage to en", () => {
    useProgressStore.getState().reset();
    expect(useProgressStore.getState().settings.instructionLanguage).toBe("en");
  });
});
