export type AuthProviders = {
  google: boolean;
  /** True when RESEND_API_KEY is set (real email delivery). */
  passwordResetEmail: boolean;
};

/** GET /api/auth/providers — which OAuth buttons / email capabilities to show. */
export async function fetchAuthProviders(): Promise<AuthProviders> {
  const res = await fetch("/api/auth/providers");
  if (!res.ok) {
    throw new Error(`providers ${res.status}`);
  }
  const body = (await res.json()) as {
    google?: boolean;
    passwordResetEmail?: boolean;
  };
  return {
    google: Boolean(body.google),
    passwordResetEmail: Boolean(body.passwordResetEmail),
  };
}
