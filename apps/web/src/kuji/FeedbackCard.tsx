import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

/**
 * Kuji FeedbackCard — post-answer explanation block.
 * Vendored from components/feedback/FeedbackCard.jsx
 */

const FEEDBACK_TONES = {
  correct: {
    color: "var(--kuji-green)",
    wash: "var(--green-a08)",
    heading: "Correct",
  },
  wrong: {
    color: "var(--kuji-coral)",
    wash: "var(--coral-a12)",
    heading: "Not quite",
  },
  info: {
    color: "var(--kuji-blue)",
    wash: "var(--blue-a08)",
    heading: "Note",
  },
} as const;

export type FeedbackCardProps = Omit<HTMLAttributes<HTMLDivElement>, "style"> & {
  tone?: keyof typeof FEEDBACK_TONES;
  heading?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  style?: CSSProperties;
};

export function FeedbackCard({
  tone = "correct",
  heading,
  children,
  action = null,
  style = {},
  ...rest
}: FeedbackCardProps) {
  const t = FEEDBACK_TONES[tone] ?? FEEDBACK_TONES.correct;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        padding: 20,
        borderRadius: "var(--radius-card)",
        background: t.wash,
        border: `2px solid color-mix(in srgb, ${t.color} 30%, transparent)`,
        ...style,
      }}
      {...rest}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            font: "var(--font-sans)",
            fontWeight: "var(--weight-bold)" as unknown as number,
            fontSize: "var(--text-md)",
            letterSpacing: "var(--tracking-tight)",
            color: t.color,
          }}
        >
          {heading ?? t.heading}
        </span>
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: 5,
            background: t.color,
            flexShrink: 0,
          }}
        />
      </div>
      <p
        style={{
          margin: 0,
          font: "var(--type-body-lg)",
          fontWeight: "var(--weight-medium)" as unknown as number,
          lineHeight: "var(--leading-tight)",
          color: "var(--text-primary)",
          letterSpacing: "var(--tracking-tight)",
        }}
      >
        {children}
      </p>
      {action}
    </div>
  );
}
