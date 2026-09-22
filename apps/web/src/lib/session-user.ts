import { headers } from "next/headers";
import { isConvexConfigured } from "@/lib/convex-env";

export type SessionUser = {
  id: string;
  email: string | null;
};

/** Session user id + email from Convex Better Auth or SQLite Better Auth. */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    if (isConvexConfigured()) {
      const { fetchAuthQuery } = await import("@/lib/auth-server");
      const { api } = await import("../../convex/_generated/api");
      const user = await fetchAuthQuery(api.auth.getCurrentUser);
      if (!user) return null;
      const record = user as {
        id?: string;
        _id?: string;
        userId?: string;
        email?: string;
      };
      const id =
        record.id ?? record.userId ?? (record._id ? String(record._id) : null);
      if (!id) return null;
      return { id, email: record.email ?? null };
    }

    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.id) return null;
    return {
      id: session.user.id,
      email: session.user.email ?? null,
    };
  } catch {
    return null;
  }
}

export async function getSessionUserId(): Promise<string | null> {
  const user = await getSessionUser();
  return user?.id ?? null;
}
