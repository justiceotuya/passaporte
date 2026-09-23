"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { StimulusImage } from "@/components/StimulusImage";
import type { ReviewQueueItem } from "@/lib/content-review";
import type { ReviewStatus } from "@/types/item";

type Props = {
  initialItems: ReviewQueueItem[];
  bypass?: boolean;
};

export function AdminReviewBoard({ initialItems, bypass = false }: Props) {
  const [items, setItems] = useState(initialItems);
  const [index, setIndex] = useState(0);
  const [editPrompt, setEditPrompt] = useState(false);
  const [pending, setPending] = useState(false);

  const current = items[index] ?? null;

  const advance = useCallback(() => {
    setEditPrompt(false);
    setItems((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
    setIndex(0);
  }, [index]);

  const applyStatus = useCallback(
    async (status: ReviewStatus, prompt?: string) => {
      if (!current || pending) return false;
      setPending(true);
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (bypass) headers["x-passaporte-admin-bypass"] = "1";
        const res = await fetch("/api/admin/review", {
          method: "POST",
          headers,
          body: JSON.stringify({
            itemId: current.id,
            status,
            prompt,
          }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          toast.error(body.error ?? `Failed (${res.status})`);
          return false;
        }
        toast.success(`${status} · ${current.id}`);
        advance();
        return true;
      } finally {
        setPending(false);
      }
    },
    [advance, bypass, current, pending],
  );

  const promptForm = useForm({
    defaultValues: { prompt: "" },
    onSubmit: async ({ value }) => {
      const next = value.prompt.trim();
      if (!next) {
        toast.error("Prompt cannot be empty");
        return;
      }
      await applyStatus("approved", next);
    },
  });

  useEffect(() => {
    if (!current) return;
    promptForm.setFieldValue("prompt", current.prompt);
    setEditPrompt(false);
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- reset only on item change

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        if (event.key === "Escape") {
          setEditPrompt(false);
        }
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "a") {
        event.preventDefault();
        void applyStatus("approved");
      } else if (key === "r") {
        event.preventDefault();
        void applyStatus("rejected");
      } else if (key === "e") {
        event.preventDefault();
        setEditPrompt(true);
      } else if (key === "arrowright" || key === "n") {
        event.preventDefault();
        setIndex((i) => Math.min(i + 1, Math.max(0, items.length - 1)));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [applyStatus, items.length]);

  if (!current) {
    return (
      <div className="card-surface p-6" data-testid="admin-review-empty">
        <p className="font-bold text-ink">Queue empty</p>
        <p className="mt-2 text-sm text-ink-muted">No pending items to review.</p>
      </div>
    );
  }

  return (
    <div data-testid="admin-review-board" data-item-id={current.id}>
      <p className="mb-4 text-xs font-bold uppercase tracking-wide text-ink-faint">
        {index + 1} remaining in view · U{current.unit} p{current.page} ·{" "}
        {current.type}
      </p>

      <div className="card-surface space-y-4 p-5">
        {current.stimulus_image ? (
          <StimulusImage
            src={current.stimulus_image}
            alt={`Stimulus for ${current.id}`}
          />
        ) : null}
        <p className="book-text">{current.instruction}</p>
        {editPrompt ? (
          <form
            className="flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void promptForm.handleSubmit();
            }}
          >
            <span className="text-xs font-bold uppercase tracking-wide text-ink-faint">
              Edit prompt
            </span>
            <promptForm.Field
              name="prompt"
              validators={{
                onChange: ({ value }) =>
                  value.trim() ? undefined : "Prompt cannot be empty",
              }}
            >
              {(field) => (
                <>
                  <textarea
                    className="min-h-24 rounded-md border border-ink/20 bg-surface px-3 py-2 text-ink"
                    value={field.state.value}
                    data-testid="admin-edit-prompt"
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {field.state.meta.errors.length > 0 ? (
                    <span className="text-xs text-error" role="alert">
                      {field.state.meta.errors.join(", ")}
                    </span>
                  ) : null}
                </>
              )}
            </promptForm.Field>
            <button
              type="submit"
              className="btn-primary"
              data-testid="admin-save-edit"
              disabled={pending || promptForm.state.isSubmitting}
            >
              Save + approve
            </button>
          </form>
        ) : (
          <h2 className="text-xl font-semibold text-ink">{current.prompt}</h2>
        )}
        <p className="text-sm text-ink-muted">
          Answer:{" "}
          <code className="text-ink">{JSON.stringify(current.answer)}</code>
        </p>
        {current.hint_en ? (
          <p className="text-sm text-ink-muted">Hint: {current.hint_en}</p>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary"
          data-testid="admin-approve"
          disabled={pending}
          onClick={() => void applyStatus("approved")}
        >
          Approve (a)
        </button>
        <button
          type="button"
          className="rounded-pill border border-ink/20 px-4 py-3 text-sm font-bold"
          data-testid="admin-edit"
          disabled={pending}
          onClick={() => setEditPrompt(true)}
        >
          Edit (e)
        </button>
        <button
          type="button"
          className="rounded-pill border border-error/40 px-4 py-3 text-sm font-bold text-error"
          data-testid="admin-reject"
          disabled={pending}
          onClick={() => void applyStatus("rejected")}
        >
          Reject (r)
        </button>
        <button
          type="button"
          className="rounded-pill border border-ink/20 px-4 py-3 text-sm font-bold text-ink-muted"
          data-testid="admin-next"
          onClick={() =>
            setIndex((i) => Math.min(i + 1, Math.max(0, items.length - 1)))
          }
        >
          Next (→)
        </button>
      </div>

      <p className="mt-4 text-xs text-ink-faint" data-testid="admin-shortcuts">
        Shortcuts: a approve · e edit · r reject · → / n next
      </p>
    </div>
  );
}
