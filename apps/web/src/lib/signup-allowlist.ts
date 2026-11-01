/**
 * Invite-only signup.
 *
 * Passaporte is a personal study tool, so new accounts are limited to the
 * emails in PASSAPORTE_ALLOWED_EMAILS (comma-separated). This keeps the app
 * from collecting other people's data.
 *
 * - List set: only those emails can sign up (email/password or Google).
 * - List empty: signup is open in development (handy for local testing and
 *   e2e) and closed in production.
 *
 * No dependencies so it can be shared by the Next app and Convex functions.
 */

export function allowedSignupEmails(
  raw: string | undefined = process.env.PASSAPORTE_ALLOWED_EMAILS,
): string[] {
  return (raw ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isSignupAllowed(
  email: string | null | undefined,
  options: { allowlist?: string[]; production?: boolean } = {},
): boolean {
  const allowlist = options.allowlist ?? allowedSignupEmails();
  const production = options.production ?? process.env.NODE_ENV === "production";

  if (allowlist.length === 0) return !production;
  if (!email) return false;
  return allowlist.includes(email.trim().toLowerCase());
}

export const SIGNUP_CLOSED_MESSAGE =
  "Sign-up is invite-only. Ask the owner to add your email to PASSAPORTE_ALLOWED_EMAILS.";
