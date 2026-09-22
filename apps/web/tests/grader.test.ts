import { describe, expect, it } from "vitest";
import {
  answersMatch,
  gradeAttempt,
  gradeChoice,
  normaliseAnswer,
  stripDiacritics,
} from "@/lib/grader";

describe("grader", () => {
  it("normalises case, whitespace, and trailing punctuation", () => {
    expect(normaliseAnswer("  Bom Dia!!! ")).toBe("bom dia");
  });

  it("strips diacritics", () => {
    expect(stripDiacritics("português")).toBe("portugues");
  });

  it("awards 10 XP on first-try correct", () => {
    const result = gradeChoice("Bom dia", "Bom dia", 1);
    expect(result).toEqual({ correct: true, xp: 10, accentOnlyMiss: false });
  });

  it("accepts accent-insensitive match on first attempt", () => {
    const result = gradeAttempt({
      given: "portugues",
      expected: "português",
      attemptNo: 1,
    });
    expect(result.correct).toBe(true);
    expect(result.xp).toBe(10);
  });

  it("enforces accents on second attempt", () => {
    const result = gradeAttempt({
      given: "portugues",
      expected: "português",
      attemptNo: 2,
    });
    expect(result.correct).toBe(false);
    expect(result.xp).toBe(0);
    expect(result.accentOnlyMiss).toBe(true);
  });

  it("awards 5 XP on second-try correct", () => {
    const result = gradeAttempt({
      given: "português",
      expected: "português",
      attemptNo: 2,
    });
    expect(result.correct).toBe(true);
    expect(result.xp).toBe(5);
  });

  it("awards 0 XP after reveal", () => {
    const result = gradeAttempt({
      given: "português",
      expected: "português",
      attemptNo: 2,
      revealed: true,
    });
    expect(result.xp).toBe(0);
    expect(result.correct).toBe(false);
  });

  it("matches accepted variants", () => {
    expect(
      answersMatch("me chamo", "chamo-me", ["me chamo"], { enforceAccents: true }),
    ).toBe(true);
  });
});
