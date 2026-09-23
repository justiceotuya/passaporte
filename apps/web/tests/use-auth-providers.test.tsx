import { describe, expect, it } from "vitest";
import { waitFor } from "@testing-library/react";
import { useAuthProviders } from "@/hooks/use-auth-providers";
import { renderWithQuery } from "./test-utils";

function ProvidersProbe() {
  const { data, isSuccess } = useAuthProviders();
  return (
    <div data-testid="probe">
      {isSuccess ? `google:${String(data?.google)}` : "loading"}
    </div>
  );
}

describe("useAuthProviders", () => {
  it("loads providers via TanStack Query", async () => {
    renderWithQuery(<ProvidersProbe />);
    await waitFor(() =>
      expect(document.querySelector("[data-testid=probe]")?.textContent).toBe(
        "google:false",
      ),
    );
  });
});
