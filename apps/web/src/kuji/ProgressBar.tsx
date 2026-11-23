import type { CSSProperties, HTMLAttributes } from "react";

/**
 * Kuji ProgressBar — rounded track with colored fill.
 * Vendored from components/display/ProgressBar.jsx
 */

const FILL = {
  green: "var(--kuji-green)",
  orange: "var(--kuji-orange)",
  blue: "var(--kuji-blue)",
  coral: "var(--kuji-coral)",
} as const;

export type ProgressBarProps = Omit<HTMLAttributes<HTMLDivElement>, "style"> & {
  value?: number;
  color?: keyof typeof FILL;
  height?: number;
  style?: CSSProperties;
};

export function ProgressBar({
  value = 0,
  color = "green",
  height = 8,
  style = {},
  ...rest
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{
        width: "100%",
        height,
        borderRadius: "var(--radius-pill)",
        background: "var(--cream-a10)",
        overflow: "hidden",
        ...style,
      }}
      {...rest}
    >
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          borderRadius: "var(--radius-pill)",
          background: FILL[color] ?? FILL.green,
          transition: "width var(--dur-slow) var(--ease-out)",
        }}
      />
    </div>
  );
}
