"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

type ResetValues = {
  password: string;
  confirm: string;
};

function showError(message: string, setInline: (msg: string | null) => void) {
  setInline(message);
  toast.error(message);
}

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const tokenError = searchParams.get("error");

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      password: "",
      confirm: "",
    } satisfies ResetValues,
    onSubmit: async ({ value }) => {
      setError(null);
      if (!token) {
        showError("Missing or invalid reset link. Request a new one.", setError);
        return;
      }
      if (value.password !== value.confirm) {
        showError("Passwords do not match", setError);
        return;
      }
      try {
        const result = await authClient.resetPassword({
          newPassword: value.password,
          token,
        });
        if (result.error) {
          showError(
            result.error.message ?? "Could not reset password",
            setError,
          );
          return;
        }
        toast.success("Password updated — sign in with your new password");
        router.push("/sign-in");
        router.refresh();
      } catch {
        showError("Something went wrong. Try again.", setError);
      }
    },
  });

  if (tokenError || !token) {
    return (
      <div
        className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10"
        data-testid="reset-password-invalid"
      >
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">
          Passaporte
        </p>
        <h1 className="mb-2 font-display text-3xl font-semibold text-ink">
          Reset link invalid
        </h1>
        <p className="mb-8 text-sm text-ink-muted">
          This password reset link is missing, expired, or already used. Request
          a new one from the forgot password page.
        </p>
        <Link href="/forgot-password" className="btn-primary w-full text-center">
          Request a new link
        </Link>
        <p className="mt-6 text-center text-sm text-ink-muted">
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
      data-testid="reset-password-form"
    >
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">
        Passaporte
      </p>
      <h1 className="mb-2 font-display text-3xl font-semibold text-ink">
        Choose a new password
      </h1>
      <p className="mb-8 text-sm text-ink-muted">
        Enter a new password for your Passaporte account. Use at least 8
        characters.
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
          name="password"
          validators={{
            onBlur: ({ value }) => {
              if (!value) return "Password is required";
              if (value.length < 8) return "Password must be at least 8 characters";
              return undefined;
            },
          }}
        >
          {(field) => (
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold text-ink-muted">New password</span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  className="min-h-tap w-full rounded-md border border-ink/10 bg-surface-card px-4 pr-20 text-ink outline-none focus:border-info"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  autoComplete="new-password"
                  data-testid="reset-password-new"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 min-h-tap -translate-y-1/2 px-2 text-xs font-bold uppercase tracking-wide text-ink-muted"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {field.state.meta.isTouched && !field.state.meta.isValid ? (
                <span className="text-xs text-error" role="alert">
                  {field.state.meta.errors.join(", ")}
                </span>
              ) : null}
            </label>
          )}
        </form.Field>

        <form.Field
          name="confirm"
          validators={{
            onBlur: ({ value }) => {
              if (!value) return "Confirm your password";
              return undefined;
            },
          }}
        >
          {(field) => (
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold text-ink-muted">Confirm password</span>
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                className="min-h-tap rounded-md border border-ink/10 bg-surface-card px-4 text-ink outline-none focus:border-info"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                autoComplete="new-password"
                data-testid="reset-password-confirm"
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
              data-testid="reset-password-submit"
            >
              {isSubmitting ? "Updating…" : "Update password"}
            </button>
          )}
        </form.Subscribe>
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        <Link href="/sign-in" className="font-semibold text-primary">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
