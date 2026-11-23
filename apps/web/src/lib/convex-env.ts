/**
 * Runtime flags for Convex. Never throw when unset — e2e and vitest run
 * without a Convex deployment.
 */

export type ContentSource = "fs" | "convex";

export function isConvexConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CONVEX_URL?.trim());
}

export function getConvexUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  return url || null;
}

/**
 * Where unit/item content (incl. review status) is read/written at runtime.
 * Explicit `CONTENT_SOURCE=fs|convex` wins; otherwise convex when URL is set.
 */
export function getContentSource(): ContentSource {
  const explicit = process.env.CONTENT_SOURCE?.trim().toLowerCase();
  if (explicit === "fs" || explicit === "convex") {
    return explicit;
  }
  return isConvexConfigured() ? "convex" : "fs";
}
