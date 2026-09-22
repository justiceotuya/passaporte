/**
 * Client-side grading for shipped answers (learners are the authors).
 * Rules from the design doc:
 * - normalise case, trailing punctuation, whitespace
 * - accents: tolerant on first attempt; enforced on second
 */

export type GradeResult = {
  correct: boolean;
  xp: number;
  accentOnlyMiss: boolean;
};

const PUNCT_TRAILING = /[.!?…,;:]+$/u;

export function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "");
}

export function normaliseAnswer(value: string): string {
  return value.trim().replace(/\s+/g, " ").replace(PUNCT_TRAILING, "").toLowerCase();
}

export function answersMatch(
  given: string,
  expected: string,
  accepted: string[],
  options: { enforceAccents: boolean },
): boolean {
  const candidates = [expected, ...accepted].map(normaliseAnswer);
  const normalisedGiven = normaliseAnswer(given);

  if (options.enforceAccents) {
    return candidates.includes(normalisedGiven);
  }

  const givenFolded = stripDiacritics(normalisedGiven);
  return candidates.some((c) => stripDiacritics(c) === givenFolded);
}

export function gradeAttempt(input: {
  given: string;
  expected: string;
  accepted?: string[];
  attemptNo: number;
  revealed?: boolean;
}): GradeResult {
  const accepted = input.accepted ?? [];

  if (input.revealed) {
    return { correct: false, xp: 0, accentOnlyMiss: false };
  }

  const enforceAccents = input.attemptNo >= 2;
  const exactOk = answersMatch(input.given, input.expected, accepted, {
    enforceAccents: true,
  });
  const foldedOk = answersMatch(input.given, input.expected, accepted, {
    enforceAccents: false,
  });

  const accentOnlyMiss = !exactOk && foldedOk;

  if (enforceAccents) {
    const correct = exactOk;
    return {
      correct,
      xp: correct ? (input.attemptNo === 1 ? 10 : 5) : 0,
      accentOnlyMiss,
    };
  }

  // First attempt: accent-tolerant
  const correct = foldedOk;
  return {
    correct,
    xp: correct ? 10 : 0,
    accentOnlyMiss: accentOnlyMiss && !correct ? false : accentOnlyMiss,
  };
}

export function gradeTrueFalse(
  given: "true" | "false",
  expected: string,
  attemptNo: number,
  revealed = false,
): GradeResult {
  return gradeAttempt({
    given,
    expected,
    accepted: [],
    attemptNo,
    revealed,
  });
}

export function gradeChoice(
  given: string,
  expected: string,
  attemptNo: number,
  revealed = false,
): GradeResult {
  return gradeAttempt({
    given,
    expected,
    accepted: [],
    attemptNo,
    revealed,
  });
}

export function gradeFillBlank(
  given: string,
  expected: string,
  accepted: string[],
  attemptNo: number,
  revealed = false,
): GradeResult {
  return gradeAttempt({
    given,
    expected,
    accepted,
    attemptNo,
    revealed,
  });
}

export type MatchPairLike = { left: string; right: string };

function pairKey(pair: MatchPairLike): string {
  return `${normaliseAnswer(pair.left)}::${normaliseAnswer(pair.right)}`;
}

/** Set-equality of left/right pairs (order independent). */
export function gradeMatch(
  given: MatchPairLike[],
  expected: MatchPairLike[],
  attemptNo: number,
  revealed = false,
): GradeResult {
  if (revealed) {
    return { correct: false, xp: 0, accentOnlyMiss: false };
  }
  if (given.length !== expected.length) {
    return { correct: false, xp: 0, accentOnlyMiss: false };
  }
  const expectedKeys = new Set(expected.map(pairKey));
  const correct =
    given.length === expectedKeys.size &&
    given.every((pair) => expectedKeys.has(pairKey(pair)));
  return {
    correct,
    xp: correct ? (attemptNo === 1 ? 10 : 5) : 0,
    accentOnlyMiss: false,
  };
}

export function gradeOrder(
  given: string[],
  expected: string[],
  attemptNo: number,
  revealed = false,
): GradeResult {
  if (revealed) {
    return { correct: false, xp: 0, accentOnlyMiss: false };
  }
  if (given.length !== expected.length) {
    return { correct: false, xp: 0, accentOnlyMiss: false };
  }
  const correct = given.every(
    (value, index) => normaliseAnswer(value) === normaliseAnswer(expected[index]),
  );
  return {
    correct,
    xp: correct ? (attemptNo === 1 ? 10 : 5) : 0,
    accentOnlyMiss: false,
  };
}

export function gradeTransform(
  given: string,
  expected: string,
  accepted: string[],
  attemptNo: number,
  revealed = false,
): GradeResult {
  return gradeFillBlank(given, expected, accepted, attemptNo, revealed);
}

export function gradeListenChoice(
  given: string,
  expected: string,
  attemptNo: number,
  revealed = false,
): GradeResult {
  return gradeChoice(given, expected, attemptNo, revealed);
}
