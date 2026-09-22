import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "rgb(var(--color-surface) / <alpha-value>)",
          deep: "rgb(var(--color-surface-deep) / <alpha-value>)",
          card: "var(--color-surface-card)",
          light: "#FCF5EF",
          lightCard: "#F3EAE1",
        },
        ink: {
          DEFAULT: "rgb(var(--color-ink) / <alpha-value>)",
          on: "rgb(var(--color-ink-on) / <alpha-value>)",
          muted: "var(--color-ink-muted)",
          faint: "var(--color-ink-faint)",
          book: "rgb(var(--color-book-ink) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "#F67A1D",
          edge: "#68330B",
          deep: "#C85A0E",
        },
        success: {
          DEFAULT: "rgb(var(--color-success) / <alpha-value>)",
          edge: "rgb(var(--color-success-edge) / <alpha-value>)",
          light: "#0A7A48",
        },
        error: {
          DEFAULT: "rgb(var(--color-error) / <alpha-value>)",
          edge: "rgb(var(--color-error-edge) / <alpha-value>)",
          light: "#C02D30",
        },
        warning: {
          DEFAULT: "#F6A81D",
        },
        info: {
          DEFAULT: "#019CF4",
          deep: "#003EE1",
        },
      },
      fontFamily: {
        sans: ["var(--font-nunito)", "Nunito", "system-ui", "sans-serif"],
        display: ["var(--font-fredoka)", "Fredoka", "Nunito", "sans-serif"],
        book: ["var(--font-book)", '"Source Serif 4"', "Georgia", "serif"],
      },
      borderRadius: {
        sm: "12px",
        md: "16px",
        lg: "20px",
        card: "24px",
        img: "32px",
        pill: "100px",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(.22,1,.36,1)",
        bounce: "cubic-bezier(.34,1.56,.64,1)",
      },
      transitionDuration: {
        fast: "120ms",
        base: "200ms",
        slow: "320ms",
      },
      minHeight: {
        tap: "44px",
      },
      minWidth: {
        tap: "44px",
      },
    },
  },
  plugins: [],
};

export default config;
