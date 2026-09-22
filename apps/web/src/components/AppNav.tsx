"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Map", testId: "nav-map" },
  { href: "/review", label: "Review", testId: "nav-review" },
  { href: "/stats", label: "Stats", testId: "nav-stats" },
  { href: "/settings", label: "Settings", testId: "nav-settings" },
] as const;

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 border-t border-ink/10 bg-surface/95 backdrop-blur"
      data-testid="app-nav"
    >
      <div className="mx-auto flex max-w-lg">
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
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
