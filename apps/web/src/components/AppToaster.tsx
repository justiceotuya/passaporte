"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { resolveAppearance } from "@/lib/appearance";
import { useProgressStore } from "@/lib/progress-store";

/** Single app-wide Sonner toaster; theme follows appearance (incl. system). */
export function AppToaster() {
  const appearance = useProgressStore((s) => s.settings.appearance ?? "system");
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    resolveAppearance(appearance),
  );

  useEffect(() => {
    const apply = () => setTheme(resolveAppearance(appearance));
    apply();
    if (appearance !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [appearance]);

  return (
    <Toaster
      theme={theme}
      position="top-center"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "!font-sans !rounded-md !border-ink/10",
          title: "!text-sm !font-semibold",
          description: "!text-sm",
        },
      }}
    />
  );
}
