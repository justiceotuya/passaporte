"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackURL = searchParams.get("next") || "/";

  const { data: session, isPending: sessionPending } = authClient.useSession();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    void fetch("/api/auth/providers")
      .then((res) => res.json())
      .then((body: { google?: boolean }) => {
        setGoogleEnabled(Boolean(body.google));
      })
      .catch(() => setGoogleEnabled(false));
  }, []);

  useEffect(() => {
    if (!sessionPending && session?.user) {
      router.replace(callbackURL);
    }
  }, [session, sessionPending, router, callbackURL]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      if (mode === "signup") {
        const result = await authClient.signUp.email({
          email,
          password,
          name: name || email.split("@")[0],
        });
        if (result.error) {
          setError(result.error.message ?? "Could not create account");
          return;
        }
      } else {
        const result = await authClient.signIn.email({ email, password });
        if (result.error) {
          setError(result.error.message ?? "Could not sign in");
          return;
        }
      }
      router.push(callbackURL);
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function onGoogle() {
    setError(null);
    setPending(true);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL,
      });
    } catch {
      setError("Google sign-in failed. Check GOOGLE_CLIENT_ID/SECRET.");
      setPending(false);
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
        disabled={pending || !googleEnabled}
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

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {mode === "signup" ? (
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-ink-muted">Name</span>
            <input
              className="min-h-tap rounded-md border border-ink/10 bg-surface-card px-4 text-ink outline-none focus:border-info"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </label>
        ) : null}

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-ink-muted">Email</span>
          <input
            type="email"
            required
            className="min-h-tap rounded-md border border-ink/10 bg-surface-card px-4 text-ink outline-none focus:border-info"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-ink-muted">Password</span>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              className="min-h-tap w-full rounded-md border border-ink/10 bg-surface-card px-4 pr-20 text-ink outline-none focus:border-info"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
        </label>

        {error ? (
          <p className="text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={pending}
          data-testid="sign-in-submit"
        >
          {pending ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        {mode === "signin" ? (
          <>
            New here?{" "}
            <button
              type="button"
              className="font-semibold text-primary"
              data-testid="sign-in-switch-signup"
              onClick={() => setMode("signup")}
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
              onClick={() => setMode("signin")}
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
