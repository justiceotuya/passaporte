/**
 * Convex-side auth email (password reset). Mirrors `src/lib/auth-email.ts`
 * because Convex cannot import from the Next.js `src/` tree.
 *
 * Set on the Convex deployment:
 *   pnpm exec convex env set RESEND_API_KEY "re_…"
 *   pnpm exec convex env set AUTH_EMAIL_FROM "Passaporte <noreply@yourdomain.com>"
 */

export function isAuthEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function authEmailFrom(): string {
  return (
    process.env.AUTH_EMAIL_FROM?.trim() ||
    "Passaporte <onboarding@resend.dev>"
  );
}

export async function sendPasswordResetEmail(params: {
  to: string;
  url: string;
}): Promise<"sent" | "logged"> {
  const text =
    `Reset your Passaporte password:\n\n${params.url}\n\n` +
    `This link expires soon. If you did not request a reset, you can ignore this email.`;

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn(
      `[passaporte] Email not configured (set RESEND_API_KEY on Convex). ` +
        `Would send to ${params.to}:\n${text}`,
    );
    return "logged";
  }

  const html = [
    "<p>Reset your Passaporte password:</p>",
    `<p><a href="${escapeAttr(params.url)}">Choose a new password</a></p>`,
    "<p>This link expires soon. If you did not request a reset, you can ignore this email.</p>",
  ].join("");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: authEmailFrom(),
      to: [params.to],
      subject: "Reset your Passaporte password",
      text,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend email failed (${res.status}): ${body || res.statusText}`);
  }

  return "sent";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/'/g, "&#39;");
}
