"use client";

import { useEffect, useState } from "react";
import { resolveAppearance } from "@/lib/appearance";
import { useProgressStore } from "@/lib/progress-store";

/** Syncs appearance setting onto <html data-theme>, including system preference. */
export function ThemeSync() {
  const appearance = useProgressStore((s) => s.settings.appearance ?? "system");
  const [, setTick] = useState(0);

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const resolved = resolveAppearance(appearance);
      root.dataset.theme = resolved;
      root.classList.toggle("dark", resolved === "dark");
      root.classList.toggle("light", resolved === "light");
    };

    apply();

    if (appearance !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      apply();
      setTick((n) => n + 1);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [appearance]);

  return null;
}
