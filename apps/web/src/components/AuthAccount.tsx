"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

/** Session-aware account controls for nav / settings. */
export function AuthAccount({
  compact = false,
}: {
  compact?: boolean;
}) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;

  async function signOut() {
    await authClient.signOut();
    router.refresh();
    router.push("/");
  }

  if (isPending) {
    return (
      <Link
        href="/sign-in"
        className={
          compact
            ? "text-xs font-bold uppercase tracking-wide text-ink-faint"
            : "btn-primary opacity-70"
        }
        data-testid="auth-sign-in"
        data-pending="true"
      >
        Sign in
      </Link>
    );
  }

  if (!user) {
    return (
      <Link
        href="/sign-in"
        className={
          compact
            ? "text-xs font-bold uppercase tracking-wide text-primary"
            : "btn-primary"
        }
        data-testid="auth-sign-in"
      >
        Sign in
      </Link>
    );
  }

  const label = user.name || user.email || "Account";
  const initial = (label.trim()[0] || "P").toUpperCase();

  if (compact) {
    return (
      <div className="flex items-center gap-2" data-testid="auth-account">
        <span className="truncate text-xs font-bold text-ink" title={user.email ?? label}>
          {label}
        </span>
        <button
          type="button"
          className="text-xs font-bold uppercase tracking-wide text-ink-muted"
          data-testid="auth-sign-out"
          onClick={() => void signOut()}
        >
          Out
        </button>
      </div>
    );
  }

  return (
    <div
      className="card-surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
      data-testid="auth-account"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink/10 text-sm font-bold">
          {initial}
        </div>
        <div>
          <p className="text-sm font-bold text-ink">{label}</p>
          {user.email ? (
            <p className="text-xs text-ink-muted">{user.email}</p>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        className="rounded-pill border border-ink/20 px-4 py-3 text-sm font-bold"
        data-testid="auth-sign-out"
        onClick={() => void signOut()}
      >
        Sign out
      </button>
    </div>
  );
}
