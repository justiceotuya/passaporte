"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchProgressSnapshot,
  postProgress,
  type ProgressBody,
} from "@/lib/progress-api";
import { queryKeys } from "@/lib/query-keys";
import { useProgressStore } from "@/lib/progress-store";
import { authClient } from "@/lib/auth-client";

/** Load remote progress when signed in; merge into the local Zustand store. */
export function useProgressSnapshot() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const mergeRemoteSnapshot = useProgressStore((s) => s.mergeRemoteSnapshot);
  const signedIn = Boolean(session?.user);

  return useQuery({
    queryKey: queryKeys.progress,
    queryFn: async () => {
      const snap = await fetchProgressSnapshot();
      mergeRemoteSnapshot(snap);
      return snap;
    },
    enabled: !sessionPending && signedIn,
    staleTime: 30_000,
  });
}

/** Best-effort POST of attempts / session finish; refreshes progress cache. */
export function useSyncProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ProgressBody) => postProgress(body),
    onSuccess: (snap) => {
      queryClient.setQueryData(queryKeys.progress, snap);
    },
  });
}
