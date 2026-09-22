"use client";

import { type ReactNode, useMemo } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { authClient } from "@/lib/auth-client";
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
 * Convex + Better Auth when configured; otherwise plain children (SQLite auth).
 * `ConvexBetterAuthProvider` includes the Convex React context.
 */
export function ConvexClientProvider({
  children,
  initialToken,
}: {
  children: ReactNode;
  initialToken?: string | null;
}) {
  const convex = useMemo(() => getConvexClient(), []);

  if (!convex) {
    return <>{children}</>;
  }

  return (
    <ConvexBetterAuthProvider
      client={convex}
      // better-auth / @convex-dev/better-auth peer type mismatch on useSession
      authClient={authClient as never}
      initialToken={initialToken}
    >
      {children}
    </ConvexBetterAuthProvider>
  );
}
