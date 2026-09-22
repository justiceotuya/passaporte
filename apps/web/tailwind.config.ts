import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#211B14",
          deep: "#0F0D0B",
          card: "rgba(252,245,239,0.05)",
          light: "#FCF5EF",
          lightCard: "#F3EAE1",
        },
        ink: {
          DEFAULT: "#FCF5EF",
          on: "#18140F",
          muted: "rgba(252,245,239,0.60)",
          faint: "rgba(252,245,239,0.40)",
          book: "#F3D9A8",
        },
        primary: {
          DEFAULT: "#F67A1D",
          edge: "#68330B",
          deep: "#C85A0E",
        },
        success: {
          DEFAULT: "#07C874",
          edge: "#05663B",
          light: "#0A7A48",
        },
        error: {
          DEFAULT: "#FF6467",
          edge: "#8A2F31",
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
