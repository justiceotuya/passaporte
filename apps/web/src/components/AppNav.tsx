"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProgressStore } from "@/lib/progress-store";
import { authClient } from "@/lib/auth-client";
import { AuthAccount } from "@/components/AuthAccount";

const links = [
  { href: "/", label: "Map", testId: "nav-map" },
  { href: "/review", label: "Review", testId: "nav-review" },
  { href: "/stats", label: "Stats", testId: "nav-stats" },
  { href: "/settings", label: "Settings", testId: "nav-settings" },
] as const;

export function AppNav() {
  const pathname = usePathname();
  const streakDays = useProgressStore((s) => s.streakDays);
  const dueCount = useProgressStore((s) => s.dueItemIds.length);
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const displayName = user?.name || user?.email || "Learner";
  const initial = (displayName.trim()[0] || "P").toUpperCase();

  return (
    <>
      {/* Mobile + laptop: bottom tab bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-ink/10 bg-surface/95 backdrop-blur lg:hidden"
        data-testid="app-nav"
        data-nav-mode="tabs"
      >
        <div className="mx-auto flex max-w-lg md:max-w-2xl">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                data-testid={link.testId}
                className={`flex min-h-[64px] flex-1 flex-col items-center justify-center text-xs font-bold ${
                  active ? "text-primary" : "text-ink-faint"
                }`}
              >
                {link.label}
                {link.href === "/review" && dueCount > 0 ? (
                  <span className="mt-0.5 rounded-pill bg-info px-1.5 py-0.5 text-[10px] font-bold text-ink-on">
                    {dueCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop: persistent 240px rail (PassaporteDesktop template) */}
      <nav
        className="fixed bottom-0 left-0 top-0 z-40 hidden w-60 flex-col border-r border-ink/10 bg-surface/95 px-4 py-6 backdrop-blur lg:flex"
        data-testid="app-nav-rail"
        data-nav-mode="rail"
        aria-label="Main"
      >
        <Link
          href="/"
          className="font-display mb-6 px-2.5 text-2xl font-semibold text-ink"
        >
          Passaporte
        </Link>
        <div className="flex flex-col gap-1.5">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                data-testid={`${link.testId}-rail`}
                className={`flex min-h-12 items-center gap-3 rounded-[14px] px-3.5 text-[15px] font-bold ${
                  active
                    ? "bg-primary/15 text-primary"
                    : "font-semibold text-ink-muted"
                }`}
              >
                <span className="flex-1">{link.label}</span>
                {link.href === "/review" && dueCount > 0 ? (
                  <span className="rounded-pill bg-info px-2 py-1 text-xs font-bold text-ink-on">
                    {dueCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
        <div className="mt-auto space-y-3">
          <div className="flex min-h-14 items-center gap-3 rounded-2xl bg-ink/5 px-3.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink/10 text-sm font-bold">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink">{displayName}</p>
              <p className="text-xs font-medium text-primary">
                {streakDays > 0 ? `${streakDays} day streak` : "Start a streak"}
              </p>
            </div>
          </div>
          <AuthAccount compact />
        </div>
      </nav>
    </>
  );
}
