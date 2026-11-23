"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { useAuthProviders } from "@/hooks/use-auth-providers";

type ForgotValues = {
  email: string;
};

function showError(message: string, setInline: (msg: string | null) => void) {
  setInline(message);
  toast.error(message);
}

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const { data: providers } = useAuthProviders();
  const emailConfigured = providers?.passwordResetEmail ?? false;

  const form = useForm({
    defaultValues: {
      email: "",
    } satisfies ForgotValues,
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const result = await authClient.requestPasswordReset({
          email: value.email.trim(),
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (result.error) {
          showError(
            result.error.message ?? "Could not send reset email",
            setError,
          );
          return;
        }
        setSent(true);
        if (emailConfigured) {
          toast.success("Check your inbox for a reset link");
        } else {
          toast.message("Reset requested — check the server console for the link");
        }
      } catch {
        showError("Something went wrong. Try again.", setError);
      }
    },
  });

  if (sent) {
    return (
      <div
        className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10"
        data-testid="forgot-password-sent"
      >
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">
          Passaporte
        </p>
        <h1 className="mb-2 font-display text-3xl font-semibold text-ink">
          Check your inbox
        </h1>
        <p className="mb-4 text-sm text-ink-muted">
          If an account exists for that email, we sent a link to reset your
          password. Open it, then choose a new password.
        </p>
        {!emailConfigured ? (
          <p
            className="mb-6 rounded-md border border-ink/10 bg-surface-card px-4 py-3 text-sm text-ink-muted"
            role="status"
          >
            Email delivery is not configured in this environment (
            <code className="text-xs">RESEND_API_KEY</code>). The reset link was
            logged in the server console instead of sent.
          </p>
        ) : null}
        <p className="text-center text-sm text-ink-muted">
          <Link href="/sign-in" className="font-semibold text-primary">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div
      className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10"
      data-testid="forgot-password-form"
    >
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">
        Passaporte
      </p>
      <h1 className="mb-2 font-display text-3xl font-semibold text-ink">
        Forgot password
      </h1>
      <p className="mb-8 text-sm text-ink-muted">
        Enter your email and we&apos;ll send a link to reset your password.
      </p>

      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <form.Field
          name="email"
          validators={{
            onBlur: ({ value }) => {
              const trimmed = value.trim();
              if (!trimmed) return "Email is required";
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
                return "Enter a valid email";
              }
              return undefined;
            },
          }}
        >
          {(field) => (
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold text-ink-muted">Email</span>
              <input
                type="email"
                required
                className="min-h-tap rounded-md border border-ink/10 bg-surface-card px-4 text-ink outline-none focus:border-info"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                autoComplete="email"
                data-testid="forgot-password-email"
              />
              {field.state.meta.isTouched && !field.state.meta.isValid ? (
                <span className="text-xs text-error" role="alert">
                  {field.state.meta.errors.join(", ")}
                </span>
              ) : null}
            </label>
          )}
        </form.Field>

        {error ? (
          <p className="text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}

        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting] as const}
        >
          {([canSubmit, isSubmitting]) => (
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={!canSubmit || isSubmitting}
              data-testid="forgot-password-submit"
            >
              {isSubmitting ? "Sending…" : "Send reset link"}
            </button>
          )}
        </form.Subscribe>
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        Remembered it?{" "}
        <Link href="/sign-in" className="font-semibold text-primary">
          Sign in
        </Link>
      </p>
    </div>
  );
}
