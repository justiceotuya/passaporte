/**
 * Optional Next.js helpers for the Convex Better Auth adapter.
 * Call only after `NEXT_PUBLIC_CONVEX_URL` + `NEXT_PUBLIC_CONVEX_SITE_URL`
 * are set and you cut auth routes over from SQLite.
 *
 * See: https://labs.convex.dev/better-auth/framework-guides/next
 */
export async function createConvexAuth() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
  if (!convexUrl || !convexSiteUrl) {
    throw new Error(
      "Convex Better Auth requires NEXT_PUBLIC_CONVEX_URL and NEXT_PUBLIC_CONVEX_SITE_URL",
    );
  }

  const { convexBetterAuthNextJs } = await import(
    "@convex-dev/better-auth/nextjs"
  );
  return convexBetterAuthNextJs({ convexUrl, convexSiteUrl });
}
