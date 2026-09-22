import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChoiceOption } from "@/components/ChoiceOption";
import { HintDisclosure } from "@/components/HintDisclosure";
import { FeedbackBanner } from "@/components/FeedbackBanner";

describe("player components", () => {
  it("renders choice states", () => {
    render(<ChoiceOption label="Bom dia" state="correct" />);
    expect(screen.getByRole("button", { name: /bom dia/i })).toBeInTheDocument();
  });

  it("expands hint without covering options", () => {
    render(
      <div>
        <HintDisclosure hint="Morning greeting." />
        <ChoiceOption label="Option A" />
      </div>,
    );
    fireEvent.click(screen.getByRole("button", { name: /hint/i }));
    expect(screen.getByText("Morning greeting.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /option a/i })).toBeInTheDocument();
  });

  it("shows inline feedback banner", () => {
    render(<FeedbackBanner correct message="Nice — first try." />);
    expect(screen.getByRole("status")).toHaveTextContent(/correct/i);
  });
});
