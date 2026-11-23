import { describe, expect, it, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { PassaporteLanding } from "@/components/PassaporteLanding";
import { renderWithQuery } from "./test-utils";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
}));

const useSession = vi.fn(() => ({ data: null, isPending: false }));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => useSession(),
    signIn: { social: vi.fn() },
  },
}));

describe("PassaporteLanding", () => {
  it("renders brand hero and try-one demo from the template", () => {
    useSession.mockReturnValue({ data: null, isPending: false });
    renderWithQuery(<PassaporteLanding />);
    expect(screen.getByTestId("passaporte-landing")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /Learn Portuguese ten minutes at a time/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("landing-start")).toHaveAttribute(
      "href",
      "/sign-in?next=/map",
    );
    expect(screen.getByTestId("landing-cta-footer")).toHaveAttribute(
      "href",
      "/sign-in?next=/map",
    );
    expect(screen.getByTestId("landing-try-demo")).toBeInTheDocument();
  });

  it("sends authenticated visitors to the map", () => {
    useSession.mockReturnValue({
      data: { user: { id: "u1", email: "a@b.co" } },
      isPending: false,
    });
    renderWithQuery(<PassaporteLanding />);
    expect(screen.getByTestId("landing-start")).toHaveAttribute("href", "/map");
    expect(replace).toHaveBeenCalledWith("/map");
  });

  it("grades the try-one demo", () => {
    useSession.mockReturnValue({ data: null, isPending: false });
    renderWithQuery(<PassaporteLanding />);
    fireEvent.click(screen.getByTestId("landing-demo-option-não-gosta"));
    expect(screen.getByText(/Correct! \+10 XP/i)).toBeInTheDocument();
  });

  it("uses shared hint and google button from Kuji cream Button", () => {
    useSession.mockReturnValue({ data: null, isPending: false });
    renderWithQuery(<PassaporteLanding />);
    expect(screen.getByTestId("landing-google")).toHaveTextContent(
      /Continue with Google/i,
    );
    fireEvent.click(screen.getByTestId("hint-toggle"));
    expect(screen.getByTestId("hint-body")).toBeInTheDocument();
  });
});
