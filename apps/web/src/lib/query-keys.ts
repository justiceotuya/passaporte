import type { ReviewStatus } from "@/types/item";

/** Shared query keys for Passaporte HTTP APIs. */
export const queryKeys = {
  authProviders: ["auth", "providers"] as const,
  progress: ["progress"] as const,
  reviewQueue: (status: ReviewStatus = "pending") =>
    ["admin", "review", status] as const,
};
