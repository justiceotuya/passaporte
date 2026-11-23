"use client";

import {
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from "react";

/**
 * Kuji Button — chunky raised pill.
 * Vendored from components/core/Button.jsx
 */

const PALETTE = {
  primary: {
    bg: "var(--kuji-orange)",
    edge: "var(--kuji-orange-edge)",
    ink: "var(--ink)",
  },
  success: {
    bg: "var(--kuji-green)",
    edge: "var(--kuji-green-edge)",
    ink: "var(--ink)",
  },
  danger: {
    bg: "var(--kuji-coral)",
    edge: "var(--kuji-coral-edge)",
    ink: "var(--ink)",
  },
  cream: {
    bg: "var(--cream)",
    edge: "rgba(24,20,15,0.18)",
    ink: "var(--ink)",
  },
  ghost: {
    bg: "var(--cream-a05)",
    edge: "transparent",
    ink: "var(--cream)",
  },
} as const;

const SIZES = {
  sm: { h: 40, pad: 18, font: "var(--text-2xs)", edge: 3 },
  md: { h: 52, pad: 28, font: "var(--text-xs)", edge: 4 },
  lg: { h: 56, pad: 32, font: "var(--text-base)", edge: 4 },
} as const;

export type KujiButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "style"
> & {
  variant?: keyof typeof PALETTE;
  size?: keyof typeof SIZES;
  fullWidth?: boolean;
  uppercase?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  style?: CSSProperties;
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  uppercase = true,
  disabled = false,
  leadingIcon = null,
  trailingIcon = null,
  onClick,
  type = "button",
  style = {},
  className,
  ...rest
}: KujiButtonProps) {
  const [pressed, setPressed] = useState(false);
  const [hover, setHover] = useState(false);
  const p = PALETTE[variant] ?? PALETTE.primary;
  const s = SIZES[size] ?? SIZES.md;
  const edge = pressed ? Math.max(1, s.edge - 2) : s.edge;

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => {
        setPressed(false);
        setHover(false);
      }}
      onPointerEnter={() => setHover(true)}
      className={className}
      style={{
        appearance: "none",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-2)",
        width: fullWidth ? "100%" : "auto",
        minHeight: s.h,
        padding: `0 ${s.pad}px`,
        boxSizing: "border-box",
        border: "none",
        borderRadius: "var(--radius-pill)",
        background: p.bg,
        color: p.ink,
        font: "var(--type-label)",
        fontSize: s.font,
        fontWeight: "var(--weight-bold)" as unknown as number,
        letterSpacing: "var(--tracking-wide)",
        textTransform: uppercase ? "uppercase" : "none",
        whiteSpace: "nowrap",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        boxShadow: `0 ${edge}px 0 0 ${p.edge}`,
        transform: `translateY(${pressed ? s.edge - edge : 0}px)`,
        filter: hover && !disabled ? "brightness(1.06)" : "none",
        transition:
          "transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out), filter var(--dur-fast) var(--ease-out)",
        WebkitTapHighlightColor: "transparent",
        userSelect: "none",
        ...style,
      }}
      {...rest}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
}
