import { describe, expect, it } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { AdminReviewBoard } from "@/components/AdminReviewBoard";
import type { ReviewQueueItem } from "@/lib/content-review";
import { server } from "@/mocks/server";
import { renderWithQuery } from "./test-utils";

const sample: ReviewQueueItem = {
  id: "pass-u01-p010-A-1",
  unit: 1,
  page: 10,
  exercise: "A",
  type: "choice",
  prompt: "Como estás?",
  instruction: "Escolhe a opção correta.",
  instruction_en: "Choose the correct option.",
  answer: "Bem",
  options: ["Bem", "Mau"],
  hint_en: "How are you?",
  review: { status: "pending", by: "join", at: "2026-01-01" },
};

describe("AdminReviewBoard", () => {
  it("documents keyboard shortcuts and fires approve", async () => {
    let posted: { status?: string } | null = null;
    server.use(
      http.get("/api/admin/review", () =>
        HttpResponse.json({ items: posted ? [] : [sample] }),
      ),
      http.post("/api/admin/review", async ({ request }) => {
        posted = (await request.json()) as { status?: string };
        return HttpResponse.json({
          item: { ...sample, review: { status: "approved" } },
        });
      }),
    );

    renderWithQuery(<AdminReviewBoard initialItems={[sample]} bypass />);
    expect(screen.getByTestId("admin-shortcuts")).toHaveTextContent(/a approve/i);
    fireEvent.click(screen.getByTestId("admin-approve"));
    await waitFor(() => expect(posted?.status).toBe("approved"));
    await waitFor(() =>
      expect(screen.getByTestId("admin-review-empty")).toBeInTheDocument(),
    );
  });

  it("opens edit mode with e shortcut", () => {
    server.use(
      http.get("/api/admin/review", () =>
        HttpResponse.json({ items: [sample] }),
      ),
    );
    renderWithQuery(<AdminReviewBoard initialItems={[sample]} />);
    fireEvent.keyDown(window, { key: "e" });
    expect(screen.getByTestId("admin-edit-prompt")).toBeInTheDocument();
  });
});
