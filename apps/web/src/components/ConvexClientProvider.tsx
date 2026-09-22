"use client";

import { type ReactNode, useMemo } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { isConvexConfigured } from "@/lib/convex-env";

let client: ConvexReactClient | null = null;

function getConvexClient(): ConvexReactClient | null {
  if (!isConvexConfigured()) return null;
  if (!client) {
    client = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  }
  return client;
}

/**
 * Wraps the app with Convex when `NEXT_PUBLIC_CONVEX_URL` is set.
 * Without it (local/e2e default), children render unchanged so SQLite auth
 * and Zustand progress keep working.
 *
 * After `npx convex login` + adapter cutover, swap this for
 * `ConvexBetterAuthProvider` from `@convex-dev/better-auth/react`.
 */
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convex = useMemo(() => getConvexClient(), []);

  if (!convex) {
    return <>{children}</>;
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
