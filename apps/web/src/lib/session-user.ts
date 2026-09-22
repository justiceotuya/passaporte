import { headers } from "next/headers";
import { isConvexConfigured } from "@/lib/convex-env";

/** Session user id from Convex Better Auth or SQLite Better Auth. */
export async function getSessionUserId(): Promise<string | null> {
  try {
    if (isConvexConfigured()) {
      const { fetchAuthQuery } = await import("@/lib/auth-server");
      const { api } = await import("../../convex/_generated/api");
      const user = await fetchAuthQuery(api.auth.getCurrentUser);
      if (!user) return null;
      const record = user as { id?: string; _id?: string; userId?: string };
      return record.id ?? record.userId ?? (record._id ? String(record._id) : null);
    }

    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}
