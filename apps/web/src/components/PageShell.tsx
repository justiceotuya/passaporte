"use client";

import type { ReactNode } from "react";
import { AppNav } from "@/components/AppNav";

type Props = {
  children: ReactNode;
  /** Show bottom/side learner nav (default true). */
  nav?: boolean;
  /** Wider content column for admin tools. */
  wide?: boolean;
  className?: string;
  testId?: string;
};

/**
 * Shared learner/admin shell.
 * Mobile: phone column + bottom nav.
 * Laptop (md): wider column, still bottom nav.
 * Desktop (lg): 240px side rail + content capped ~760px (design template).
 */
export function PageShell({
  children,
  nav = true,
  wide = false,
  className = "",
  testId,
}: Props) {
  const width = wide
    ? "max-w-lg md:max-w-3xl lg:max-w-4xl"
    : "max-w-lg md:max-w-2xl lg:max-w-[760px]";

  return (
    <div
      className={[
        "min-h-screen w-full",
        nav ? "lg:pl-60" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-testid={testId}
    >
      <div
        className={[
          "mx-auto flex w-full flex-col px-4 pt-6 md:px-6 lg:px-10 lg:pt-8",
          width,
          nav ? "pb-24 lg:pb-10" : "pb-8",
        ].join(" ")}
      >
        {children}
      </div>
      {nav ? <AppNav /> : null}
    </div>
  );
}
