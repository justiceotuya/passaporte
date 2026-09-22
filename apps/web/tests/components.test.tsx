import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChoiceOption } from "@/components/ChoiceOption";
import { HintDisclosure } from "@/components/HintDisclosure";
import { FeedbackBanner } from "@/components/FeedbackBanner";
import { StimulusImage } from "@/components/StimulusImage";
import { FillBlankTyped } from "@/components/FillBlankTyped";
import { MatchPairTap } from "@/components/MatchPairTap";
import { OrderSequence } from "@/components/OrderSequence";
import { ListenTranscript } from "@/components/ListenTranscript";

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

  it("renders stimulus image with max height constraint", () => {
    render(<StimulusImage src="crops/pass-u01-p010-D-1.webp" />);
    const trigger = screen.getByTestId("stimulus-image-zoom");
    const img = trigger.querySelector("img");
    expect(img).toHaveAttribute("src", "/crops/pass-u01-p010-D-1.webp");
    expect(img?.className).toMatch(/max-h-\[240px\]/);
  });

  it("opens and closes stimulus image lightbox", () => {
    render(<StimulusImage src="crops/pass-u01-p010-D-1.webp" />);
    fireEvent.click(screen.getByRole("button", { name: /enlarge/i }));
    expect(screen.getByRole("dialog", { name: /enlarged image/i })).toBeInTheDocument();
    expect(screen.getByTestId("image-lightbox").querySelector("img")).toHaveAttribute(
      "src",
      "/crops/pass-u01-p010-D-1.webp",
    );

    fireEvent.click(screen.getByTestId("image-lightbox-close"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes lightbox on Escape and backdrop click", () => {
    render(<StimulusImage src="crops/pass-u01-p010-D-1.webp" />);
    fireEvent.click(screen.getByRole("button", { name: /enlarge/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /enlarge/i }));
    fireEvent.click(screen.getByTestId("image-lightbox-backdrop"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("fill_blank typed inserts diacritics and submits", () => {
    const onSubmit = vi.fn();
    let value = "";
    const onChange = (next: string) => {
      value = next;
    };
    const { rerender } = render(
      <FillBlankTyped value={value} onChange={onChange} onSubmit={onSubmit} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "á" }));
    rerender(
      <FillBlankTyped value={value} onChange={onChange} onSubmit={onSubmit} />,
    );
    expect(screen.getByTestId("fill-blank-input")).toHaveValue("á");
    fireEvent.click(screen.getByTestId("fill-blank-submit"));
    expect(onSubmit).toHaveBeenCalled();
  });

  it("match pair-tap locks correct pairs and completes", () => {
    const onComplete = vi.fn();
    render(
      <MatchPairTap
        pairs={[
          { left: "aqui", right: "A" },
          { left: "ali", right: "B" },
        ]}
        onComplete={onComplete}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "aqui" }));
    fireEvent.click(screen.getByRole("button", { name: "A" }));
    fireEvent.click(screen.getByRole("button", { name: "ali" }));
    fireEvent.click(screen.getByRole("button", { name: "B" }));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toEqual([
      { left: "aqui", right: "A" },
      { left: "ali", right: "B" },
    ]);
  });

  it("order sequence submits picked order", () => {
    const onSubmit = vi.fn();
    render(
      <OrderSequence sequence={["one", "two"]} onSubmit={onSubmit} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "one" }));
    fireEvent.click(screen.getByRole("button", { name: "two" }));
    fireEvent.click(screen.getByTestId("order-submit"));
    expect(onSubmit).toHaveBeenCalledWith(["one", "two"]);
  });

  it("listen transcript toggles open", () => {
    render(<ListenTranscript transcript="Olá, bom dia." />);
    expect(screen.queryByText("Olá, bom dia.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /show transcript/i }));
    expect(screen.getByText("Olá, bom dia.")).toBeInTheDocument();
  });
});
