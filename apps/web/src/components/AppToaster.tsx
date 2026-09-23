"use client";

import { Toaster } from "sonner";
import { useProgressStore } from "@/lib/progress-store";

/** Single app-wide Sonner toaster; theme follows appearance setting. */
export function AppToaster() {
  const appearance = useProgressStore((s) => s.settings.appearance ?? "light");

  return (
    <Toaster
      theme={appearance === "dark" ? "dark" : "light"}
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
