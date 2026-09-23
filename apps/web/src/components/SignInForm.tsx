"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { useAuthProviders } from "@/hooks/use-auth-providers";

type AuthMode = "signin" | "signup";

type SignInValues = {
  name: string;
  email: string;
  password: string;
};

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  account_not_linked:
    "This email already has a Passaporte account. Sign in with email/password, then try Google again.",
  unable_to_link_account: "Could not link Google to this account. Try email sign-in.",
  "email_doesn't_match": "Google email does not match your Passaporte account.",
  access_denied: "Google sign-in was cancelled.",
};

function showError(message: string, setInline: (msg: string | null) => void) {
  setInline(message);
  toast.error(message);
}

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackURL = searchParams.get("next") || "/map";

  const { data: session, isPending: sessionPending } = authClient.useSession();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googlePending, setGooglePending] = useState(false);

  const { data: providers } = useAuthProviders();
  const googleEnabled = providers?.google ?? false;

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    } satisfies SignInValues,
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        if (mode === "signup") {
          const result = await authClient.signUp.email({
            email: value.email.trim(),
            password: value.password,
            name: value.name.trim() || value.email.split("@")[0],
          });
          if (result.error) {
            showError(result.error.message ?? "Could not create account", setError);
            return;
          }
          toast.success("Account created");
        } else {
          const result = await authClient.signIn.email({
            email: value.email.trim(),
            password: value.password,
          });
          if (result.error) {
            showError(result.error.message ?? "Could not sign in", setError);
            return;
          }
          toast.success("Signed in");
        }
        router.push(callbackURL);
        router.refresh();
      } catch {
        showError("Something went wrong. Try again.", setError);
      }
    },
  });

  useEffect(() => {
    const oauthError = searchParams.get("error");
    if (!oauthError) return;
    const message =
      OAUTH_ERROR_MESSAGES[oauthError] ?? `Sign-in failed (${oauthError}).`;
    showError(message, setError);
  }, [searchParams]);

  useEffect(() => {
    if (!sessionPending && session?.user) {
      router.replace(callbackURL);
    }
  }, [session, sessionPending, router, callbackURL]);

  function switchMode(next: AuthMode) {
    setMode(next);
    setError(null);
    form.reset();
  }

  async function onGoogle() {
    setError(null);
    setGooglePending(true);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL,
      });
    } catch {
      showError("Google sign-in failed. Check GOOGLE_CLIENT_ID/SECRET.", setError);
      setGooglePending(false);
    }
  }

  if (sessionPending) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-4">
        <p className="text-sm text-ink-muted">Checking session…</p>
      </div>
    );
  }

  return (
    <div
      className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10"
      data-testid="sign-in-form"
    >
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">
        Passaporte
      </p>
      <h1 className="mb-2 font-display text-3xl font-semibold text-ink">
        {mode === "signin" ? "Welcome back" : "Create an account"}
      </h1>
      <p className="mb-8 text-sm text-ink-muted">
        Learn A1 Portuguese in short, scored sessions.
      </p>

      <button
        type="button"
        disabled={googlePending || form.state.isSubmitting || !googleEnabled}
        data-testid="sign-in-google"
        onClick={() => void onGoogle()}
        className="card-surface mb-4 flex min-h-tap w-full items-center justify-center gap-2 px-4 text-sm font-semibold disabled:text-ink-faint"
        title={
          googleEnabled
            ? "Continue with Google"
            : "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable"
        }
      >
        Continue with Google
        {!googleEnabled ? (
          <span className="rounded-pill bg-ink/10 px-2 py-0.5 text-[10px] uppercase tracking-wide">
            Needs keys
          </span>
        ) : null}
      </button>

      <div className="mb-4 flex items-center gap-3 text-xs uppercase tracking-wide text-ink-faint">
        <div className="h-px flex-1 bg-ink/10" />
        or
        <div className="h-px flex-1 bg-ink/10" />
      </div>

      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        {mode === "signup" ? (
          <form.Field name="name">
            {(field) => (
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-semibold text-ink-muted">Name</span>
                <input
                  className="min-h-tap rounded-md border border-ink/10 bg-surface-card px-4 text-ink outline-none focus:border-info"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  autoComplete="name"
                />
              </label>
            )}
          </form.Field>
        ) : null}

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
              />
              {field.state.meta.isTouched && !field.state.meta.isValid ? (
                <span className="text-xs text-error" role="alert">
                  {field.state.meta.errors.join(", ")}
                </span>
              ) : null}
            </label>
          )}
        </form.Field>

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
              <span className="font-semibold text-ink-muted">Password</span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  className="min-h-tap w-full rounded-md border border-ink/10 bg-surface-card px-4 pr-20 text-ink outline-none focus:border-info"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
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

        {error ? (
          <p className="text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}

        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
          {([canSubmit, isSubmitting]) => (
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={!canSubmit || isSubmitting || googlePending}
              data-testid="sign-in-submit"
            >
              {isSubmitting
                ? "Please wait…"
                : mode === "signin"
                  ? "Sign in"
                  : "Create account"}
            </button>
          )}
        </form.Subscribe>
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        {mode === "signin" ? (
          <>
            New here?{" "}
            <button
              type="button"
              className="font-semibold text-primary"
              data-testid="sign-in-switch-signup"
              onClick={() => switchMode("signup")}
            >
              Create an account
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button
              type="button"
              className="font-semibold text-primary"
              data-testid="sign-in-switch-signin"
              onClick={() => switchMode("signin")}
            >
              Sign in
            </button>
          </>
        )}
      </p>

      <p className="mt-8 text-center text-xs text-ink-faint">
        <Link href="/">Continue without account</Link>
        {" · "}
        <Link href="/play">Skip to player</Link>
      </p>
    </div>
  );
}
