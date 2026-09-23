"use client";

import { useProgressSnapshot } from "@/hooks/use-progress";

/**
 * Mount once under QueryProvider to pull remote progress for signed-in users.
 * Renders nothing — side effect only.
 */
export function ProgressHydrator() {
  useProgressSnapshot();
  return null;
}
