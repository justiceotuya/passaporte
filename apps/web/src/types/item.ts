/**
 * Hand-maintained types mirroring schema/item.schema.json.
 * Keep in sync when the JSON Schema changes (Phase 1 contract).
 */

export type BookId = "passaporte" | "valer" | "sample";

export type ItemType =
  | "choice"
  | "fill_blank"
  | "match"
  | "order"
  | "true_false"
  | "transform"
  | "listen_choice"
  | "open";

export type Skill =
  | "grammar"
  | "vocabulary"
  | "reading"
  | "listening"
  | "other";

export type AnswerSource =
  | "teacher_book"
  | "student_book_key"
  | "generated"
  | "original";

export type ReviewStatus = "pending" | "approved" | "rejected";

export interface MatchPair {
  left: string;
  right: string;
}

export interface Review {
  status: ReviewStatus;
  by?: string;
  at?: string;
  notes?: string;
}

export interface PassaporteItem {
  id: string;
  book: BookId;
  unit: number;
  page: number;
  exercise: string;
  type: ItemType;
  skill: Skill;
  topic: string;
  instruction: string;
  /** English translation of the book instruction (optional until generated). */
  instruction_en?: string;
  prompt: string;
  options?: string[];
  pairs?: MatchPair[];
  sequence?: string[];
  answer: string | string[] | MatchPair[];
  accepted: string[];
  hint_en?: string;
  stimulus_image?: string | null;
  transcript?: string;
  answer_source: AnswerSource;
  review: Review;
}

export interface PassaporteUnit {
  book: BookId;
  unit: number;
  title: string;
  topics?: string[];
  items: PassaporteItem[];
}

export const CLOSED_ITEM_TYPES: readonly ItemType[] = [
  "choice",
  "fill_blank",
  "match",
  "order",
  "true_false",
  "transform",
  "listen_choice",
] as const;
