export type AuthProviders = {
  google: boolean;
};

/** GET /api/auth/providers — which OAuth buttons to show. */
export async function fetchAuthProviders(): Promise<AuthProviders> {
  const res = await fetch("/api/auth/providers");
  if (!res.ok) {
    throw new Error(`providers ${res.status}`);
  }
  const body = (await res.json()) as { google?: boolean };
  return { google: Boolean(body.google) };
}
