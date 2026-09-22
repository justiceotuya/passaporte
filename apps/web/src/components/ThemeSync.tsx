"use client";

import { useEffect } from "react";
import { useProgressStore } from "@/lib/progress-store";

/** Syncs appearance setting onto <html data-theme>. */
export function ThemeSync() {
  const appearance = useProgressStore((s) => s.settings.appearance ?? "light");

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = appearance;
    root.classList.toggle("dark", appearance === "dark");
    root.classList.toggle("light", appearance === "light");
  }, [appearance]);

  return null;
}
