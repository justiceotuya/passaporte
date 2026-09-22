import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminReviewBoard } from "@/components/AdminReviewBoard";
import type { ReviewQueueItem } from "@/lib/content-review";

const sample: ReviewQueueItem = {
  id: "pass-u01-p010-A-1",
  unit: 1,
  page: 10,
  exercise: "A",
  type: "choice",
  prompt: "Como estás?",
  instruction: "Escolhe a opção correta.",
  answer: "Bem",
  options: ["Bem", "Mau"],
  hint_en: "How are you?",
  review: { status: "pending", by: "join", at: "2026-01-01" },
};

describe("AdminReviewBoard", () => {
  it("documents keyboard shortcuts and fires approve", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ item: { ...sample, review: { status: "approved" } } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminReviewBoard initialItems={[sample]} bypass />);
    expect(screen.getByTestId("admin-shortcuts")).toHaveTextContent(/a approve/i);
    fireEvent.click(screen.getByTestId("admin-approve"));
    expect(fetchMock).toHaveBeenCalled();
    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.status).toBe("approved");
    vi.unstubAllGlobals();
  });

  it("opens edit mode with e shortcut", () => {
    render(<AdminReviewBoard initialItems={[sample]} />);
    fireEvent.keyDown(window, { key: "e" });
    expect(screen.getByTestId("admin-edit-prompt")).toBeInTheDocument();
  });
});
