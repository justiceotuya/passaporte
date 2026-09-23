"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchReviewQueue,
  postReviewAction,
  type ReviewActionBody,
} from "@/lib/review-api";
import { queryKeys } from "@/lib/query-keys";
import type { ReviewQueueItem } from "@/lib/content-review";
import type { ReviewStatus } from "@/types/item";

/** Admin review queue (SSR initialData + client refetch). */
export function useReviewQueue(opts: {
  status?: ReviewStatus;
  bypass?: boolean;
  initialItems?: ReviewQueueItem[];
}) {
  const status = opts.status ?? "pending";
  return useQuery({
    queryKey: queryKeys.reviewQueue(status),
    queryFn: () => fetchReviewQueue(status, { bypass: opts.bypass }),
    initialData: opts.initialItems,
    staleTime: 15_000,
  });
}

/** Approve / reject / edit an item in the review queue. */
export function useReviewAction(opts?: { bypass?: boolean }) {
  const queryClient = useQueryClient();
  const bypass = opts?.bypass;

  return useMutation({
    mutationFn: (body: ReviewActionBody) => postReviewAction(body, { bypass }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "review"] });
    },
  });
}
