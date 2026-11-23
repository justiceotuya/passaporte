/**
 * Auth transactional email (password reset).
 * Prefer Resend HTTP API — no extra dependency.
 *
 * Required for real delivery:
 *   RESEND_API_KEY
 *   AUTH_EMAIL_FROM (e.g. "Passaporte <noreply@yourdomain.com>")
 *
 * Without those, reset tokens still work but the link is only logged server-side.
 */

export function isAuthEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function authEmailFrom(): string {
  return (
    process.env.AUTH_EMAIL_FROM?.trim() ||
    "Passaporte <onboarding@resend.dev>"
  );
}

type SendAuthEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

/**
 * Send via Resend. Throws if the API key is set but delivery fails.
 * Returns `"sent"` | `"logged"` so callers can avoid silent failure.
 */
export async function sendAuthEmail(
  input: SendAuthEmailInput,
): Promise<"sent" | "logged"> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn(
      `[passaporte] Email not configured (set RESEND_API_KEY). ` +
        `Would send to ${input.to}: ${input.subject}\n${input.text}`,
    );
    return "logged";
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: authEmailFrom(),
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html ?? `<p>${escapeHtml(input.text).replace(/\n/g, "<br/>")}</p>`,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend email failed (${res.status}): ${body || res.statusText}`);
  }

  return "sent";
}

export async function sendPasswordResetEmail(params: {
  to: string;
  url: string;
}): Promise<"sent" | "logged"> {
  const text =
    `Reset your Passaporte password:\n\n${params.url}\n\n` +
    `This link expires soon. If you did not request a reset, you can ignore this email.`;

  return sendAuthEmail({
    to: params.to,
    subject: "Reset your Passaporte password",
    text,
    html: [
      "<p>Reset your Passaporte password:</p>",
      `<p><a href="${escapeAttr(params.url)}">Choose a new password</a></p>`,
      "<p>This link expires soon. If you did not request a reset, you can ignore this email.</p>",
    ].join(""),
  });
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
