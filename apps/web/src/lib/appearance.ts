export type AppearanceSetting = "system" | "light" | "dark";

export function prefersDarkScheme(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Resolve stored appearance to a concrete light/dark theme. */
export function resolveAppearance(
  appearance: AppearanceSetting | undefined,
): "light" | "dark" {
  if (appearance === "light" || appearance === "dark") return appearance;
  return prefersDarkScheme() ? "dark" : "light";
}
