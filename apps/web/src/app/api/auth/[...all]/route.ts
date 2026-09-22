import { isConvexConfigured } from "@/lib/convex-env";

/**
 * Auth route handlers:
 * - Convex Better Auth when `NEXT_PUBLIC_CONVEX_URL` is set
 * - SQLite Better Auth fallback for local/e2e without a deployment
 */
async function loadHandlers() {
  if (isConvexConfigured()) {
    const { handler } = await import("@/lib/auth-server");
    return handler;
  }
  const { auth } = await import("@/lib/auth");
  const { toNextJsHandler } = await import("better-auth/next-js");
  return toNextJsHandler(auth);
}

const handlersPromise = loadHandlers();

export async function GET(request: Request) {
  const handlers = await handlersPromise;
  return handlers.GET(request);
}

export async function POST(request: Request) {
  const handlers = await handlersPromise;
  return handlers.POST(request);
}
