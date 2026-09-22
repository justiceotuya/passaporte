import { describe, expect, it } from "vitest";
import tokens from "../tailwind.config";

describe("design tokens", () => {
  it("includes required Passaporte color roles", () => {
    const colors = tokens.theme?.extend?.colors as Record<string, unknown>;
    expect(colors.primary).toBeTruthy();
    expect(colors.success).toBeTruthy();
    expect(colors.error).toBeTruthy();
    expect(colors.warning).toBeTruthy();
    expect((colors.ink as { book?: string }).book).toBe("#F3D9A8");
    expect((colors.success as { light?: string }).light).toBe("#0A7A48");
    expect((colors.error as { light?: string }).light).toBe("#C02D30");
  });

  it("includes book font family for Portuguese content", () => {
    const fonts = tokens.theme?.extend?.fontFamily as Record<string, string[]>;
    expect(fonts.book.join(" ")).toMatch(/Source Serif 4|font-book/);
  });

  it("includes Kuji radii scale", () => {
    const radii = tokens.theme?.extend?.borderRadius as Record<string, string>;
    expect(radii.card).toBe("24px");
    expect(radii.pill).toBe("100px");
  });
});
