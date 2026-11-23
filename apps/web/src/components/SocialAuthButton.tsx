"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Button } from "@/kuji";
import { GoogleMark } from "@/components/GoogleMark";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Shown when Google OAuth is not configured. */
  needsKeys?: boolean;
  children?: ReactNode;
};

/**
 * Cream social auth pill — Kuji Button (cream) + Google mark from
 * templates/passaporte/PassaporteLanding.dc.html.
 */
export function SocialAuthButton({
  needsKeys = false,
  children = "Continue with Google",
  className = "",
  disabled,
  style,
  ...rest
}: Props) {
  const fullWidth = !className.split(/\s+/).includes("w-auto");

  return (
    <Button
      variant="cream"
      size="lg"
      uppercase={false}
      disabled={disabled}
      leadingIcon={<GoogleMark />}
      className={className}
      fullWidth={fullWidth}
      style={{
        fontSize: 15,
        letterSpacing: "normal",
        gap: 10,
        padding: "0 22px",
        ...style,
      }}
      title={
        needsKeys
          ? "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable"
          : "Continue with Google"
      }
      {...rest}
    >
      <span>{children}</span>
      {needsKeys ? (
        <span
          style={{
            borderRadius: 100,
            background: "rgba(24,20,15,0.10)",
            padding: "2px 8px",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "rgba(24,20,15,0.70)",
          }}
        >
          Needs keys
        </span>
      ) : null}
    </Button>
  );
}
