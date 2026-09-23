"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAuthProviders } from "@/lib/auth-providers";
import { queryKeys } from "@/lib/query-keys";

/** Which OAuth providers are configured (shared by landing + sign-in). */
export function useAuthProviders() {
  return useQuery({
    queryKey: queryKeys.authProviders,
    queryFn: fetchAuthProviders,
    staleTime: 5 * 60_000,
  });
}
