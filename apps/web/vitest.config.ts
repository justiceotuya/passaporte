import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@schema": path.resolve(__dirname, "../../schema"),
      "@content": path.resolve(__dirname, "../../content"),
      "@convex": path.resolve(__dirname, "./convex"),
    },
  },
});
