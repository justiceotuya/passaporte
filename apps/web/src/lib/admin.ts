/**
 * Admin access for content review.
 * Set PASSAPORTE_ADMIN_EMAILS=comma,separated@emails
 * Optional PASSAPORTE_ADMIN_BYPASS=1 for local/dev tooling only (never in prod).
 */

export function adminEmails(): string[] {
  return (process.env.PASSAPORTE_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminBypassEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.PASSAPORTE_ADMIN_BYPASS === "1";
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = adminEmails();
  if (allowed.length === 0) return false;
  return allowed.includes(email.trim().toLowerCase());
}

export function assertAdminAccess(input: {
  email: string | null | undefined;
  bypass?: boolean;
}): { ok: true } | { ok: false; status: 401 | 403 | 404; error: string } {
  const configured = adminEmails().length > 0 || isAdminBypassEnabled();
  if (!configured) {
    return { ok: false, status: 404, error: "Admin review disabled" };
  }
  if (input.bypass && isAdminBypassEnabled()) {
    return { ok: true };
  }
  if (!input.email) {
    return { ok: false, status: 401, error: "Unauthenticated" };
  }
  if (!isAdminEmail(input.email)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return { ok: true };
}
