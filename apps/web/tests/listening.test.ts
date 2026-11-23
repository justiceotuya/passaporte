import { describe, expect, it } from "vitest";
import type { PassaporteItem } from "@/types/item";
import {
  isListeningItem,
  listeningAudioSrc,
  listeningSpeakText,
} from "@/lib/listening";

function base(partial: Partial<PassaporteItem>): PassaporteItem {
  return {
    id: "pass-u01-x",
    book: "passaporte",
    unit: 1,
    page: 1,
    exercise: "A",
    type: "choice",
    skill: "vocabulary",
    topic: "unknown",
    instruction: "Escolha",
    prompt: "prompt",
    answer: "a",
    accepted: [],
    answer_source: "teacher_book",
    review: { status: "approved" },
    ...partial,
  };
}

describe("listening helpers", () => {
  it("detects listening items", () => {
    expect(isListeningItem(base({ skill: "listening" }))).toBe(true);
    expect(isListeningItem(base({ type: "listen_choice" }))).toBe(true);
    expect(isListeningItem(base({ transcript: "Olá" }))).toBe(true);
    expect(isListeningItem(base({ audio: "audio/x.mp3" }))).toBe(true);
    expect(isListeningItem(base({}))).toBe(false);
  });

  it("prefers transcript for speak text", () => {
    expect(
      listeningSpeakText(
        base({
          skill: "listening",
          transcript: "Bom dia.",
          prompt: "Write: um, dois",
        }),
      ),
    ).toBe("Bom dia.");
  });

  it("extracts word list after colon", () => {
    expect(
      listeningSpeakText(
        base({
          skill: "listening",
          type: "fill_blank",
          prompt:
            "Write the numbers in order of listening: segunda-feira, terça-feira, quarta-feira",
        }),
      ),
    ).toBe("segunda-feira. terça-feira. quarta-feira");
  });

  it("speaks order sequence tokens", () => {
    expect(
      listeningSpeakText(
        base({
          skill: "listening",
          type: "order",
          prompt: "Ouça as palavras",
          sequence: ["avô", "avó", "avós"],
          answer: ["avô", "avó", "avós"],
        }),
      ),
    ).toBe("avô. avó. avós");
  });

  it("normalizes audio paths", () => {
    expect(listeningAudioSrc(base({ audio: "audio/x.mp3" }))).toBe(
      "/audio/x.mp3",
    );
    expect(listeningAudioSrc(base({ audio: "/audio/x.mp3" }))).toBe(
      "/audio/x.mp3",
    );
    expect(listeningAudioSrc(base({}))).toBeUndefined();
  });
});
