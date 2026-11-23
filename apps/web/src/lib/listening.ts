import type { PassaporteItem } from "@/types/item";

/** Items that expect an audio / listen affordance in the session player. */
export function isListeningItem(item: PassaporteItem): boolean {
  return (
    item.type === "listen_choice" ||
    item.skill === "listening" ||
    Boolean(item.transcript?.trim()) ||
    Boolean(item.audio?.trim())
  );
}

function orderSequence(item: PassaporteItem): string[] {
  return item.sequence ?? [];
}

/**
 * Best-effort Portuguese text to speak when no real audio file exists.
 * Prefer transcript; otherwise extract word lists / order tokens from the prompt.
 */
export function listeningSpeakText(item: PassaporteItem): string | undefined {
  const transcript = item.transcript?.trim();
  if (transcript) return transcript;

  if (item.type === "order") {
    const seq = orderSequence(item).map((s) => s.trim()).filter(Boolean);
    if (seq.length >= 2) return seq.join(". ");
  }

  const prompt = item.prompt?.trim() ?? "";
  if (!prompt) return undefined;

  // "…listening: segunda-feira, terça-feira, …"
  const colon = prompt.lastIndexOf(":");
  if (colon >= 0 && colon < prompt.length - 1) {
    const after = prompt.slice(colon + 1).trim();
    const tokens = after.split(/[,/;]|·/).map((t) => t.trim()).filter(Boolean);
    if (tokens.length >= 2) return tokens.join(". ");
    if (after.length >= 8 && !/^item\s+\d+/i.test(after)) return after;
  }

  // "a. isso / b. isto" or "a. chá ___ já ___"
  if (/^[a-z]\.\s+/i.test(prompt)) {
    const cleaned = prompt
      .replace(/[a-z]\.\s*/gi, "")
      .replace(/_+/g, " ")
      .replace(/\s*\/\s*/g, ". ")
      .replace(/\s+/g, " ")
      .trim();
    if (cleaned.length >= 2) return cleaned;
  }

  // Space-separated word list (no clause punctuation)
  if (
    prompt.length < 100 &&
    !/[.?!]/.test(prompt) &&
    prompt.split(/\s+/).length >= 2 &&
    /^[\p{L}\d\s\/\-·]+$/u.test(prompt)
  ) {
    return prompt.replace(/\s*\/\s*/g, ". ");
  }

  return undefined;
}

export function listeningAudioSrc(item: PassaporteItem): string | undefined {
  const raw = item.audio?.trim();
  if (!raw) return undefined;
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("/")) {
    return raw;
  }
  return `/${raw.replace(/^\.\//, "")}`;
}
