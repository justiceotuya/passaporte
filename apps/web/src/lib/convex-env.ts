/**
 * Runtime flags for Convex. Never throw when unset — e2e and vitest run
 * without a Convex deployment.
 */

export function isConvexConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CONVEX_URL?.trim());
}

export function getConvexUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  return url || null;
}
