import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/** Better Auth session user id, or null when anonymous / unavailable. */
export async function getSessionUserId(): Promise<string | null> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}
