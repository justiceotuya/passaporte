import { describe, expect, it, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { PassaporteLanding } from "@/components/PassaporteLanding";
import { renderWithQuery } from "./test-utils";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => ({ data: null, isPending: false }),
    signIn: { social: vi.fn() },
  },
}));

describe("PassaporteLanding", () => {
  it("renders brand hero and try-one demo from the template", () => {
    renderWithQuery(<PassaporteLanding />);
    expect(screen.getByTestId("passaporte-landing")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /Learn Portuguese ten minutes at a time/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("landing-start")).toHaveAttribute("href", "/map");
    expect(screen.getByTestId("landing-try-demo")).toBeInTheDocument();
  });

  it("grades the try-one demo", () => {
    renderWithQuery(<PassaporteLanding />);
    fireEvent.click(screen.getByTestId("landing-demo-option-não-gosta"));
    expect(screen.getByText(/Correct! \+10 XP/i)).toBeInTheDocument();
  });
});
