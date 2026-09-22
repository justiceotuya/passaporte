import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";

/**
 * Always include the Convex Better Auth client plugin so types match
 * `ConvexBetterAuthProvider`. When Convex is not configured, the provider
 * is skipped and SQLite auth routes still serve `/api/auth`.
 */
export const authClient = createAuthClient({
  plugins: [convexClient()],
});
