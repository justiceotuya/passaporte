"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { StimulusImage } from "@/components/StimulusImage";
import { instructionForDisplay } from "@/lib/instruction-display";
import type { ReviewQueueItem } from "@/lib/content-review";
import { useProgressStore } from "@/lib/progress-store";
import { useReviewAction, useReviewQueue } from "@/hooks/use-review";
import type { ReviewStatus } from "@/types/item";

type Props = {
  initialItems: ReviewQueueItem[];
  bypass?: boolean;
};

export function AdminReviewBoard({ initialItems, bypass = false }: Props) {
  const { data: items = [] } = useReviewQueue({
    bypass,
    initialItems,
  });
  const [index, setIndex] = useState(0);
  const [editPrompt, setEditPrompt] = useState(false);
  const instructionLanguage = useProgressStore(
    (s) => s.settings.instructionLanguage ?? "en",
  );

  const current = items[Math.min(index, Math.max(0, items.length - 1))] ?? null;

  const reviewMutation = useReviewAction({ bypass });
  const pending = reviewMutation.isPending;

  const applyStatus = useCallback(
    async (status: ReviewStatus, prompt?: string) => {
      if (!current || pending) return false;
      try {
        await reviewMutation.mutateAsync({
          status,
          prompt,
          itemId: current.id,
        });
        toast.success(`${status} · ${current.id}`);
        setEditPrompt(false);
        setIndex(0);
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Review failed");
        return false;
      }
    },
    [current, pending, reviewMutation],
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
        {items.length} remaining · U{current.unit} p{current.page} · {current.type}
      </p>

      <div className="card-surface space-y-4 p-5">
        {current.stimulus_image ? (
          <StimulusImage
            src={current.stimulus_image}
            alt={`Stimulus for ${current.id}`}
          />
        ) : null}
        <p className="book-text">
          {instructionForDisplay(current, instructionLanguage)}
        </p>
        {instructionLanguage === "en" &&
        current.instruction_en?.trim() &&
        current.instruction.trim() &&
        current.instruction_en.trim() !== current.instruction.trim() ? (
          <p className="text-sm text-ink-muted" data-testid="admin-instruction-pt">
            PT: {current.instruction}
          </p>
        ) : null}
        {editPrompt ? (
          <form
            className="flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void promptForm.handleSubmit();
            }}
          >
            <promptForm.Field name="prompt">
              {(field) => (
                <textarea
                  className="min-h-24 w-full rounded-2xl border border-ink/15 bg-surface px-3 py-2 text-base font-semibold text-ink"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  data-testid="admin-edit-prompt"
                />
              )}
            </promptForm.Field>
            <div className="flex gap-2">
              <button
                type="submit"
                className="btn-primary"
                disabled={pending}
                data-testid="admin-save-prompt"
              >
                Save & approve
              </button>
              <button
                type="button"
                className="rounded-pill border border-ink/20 px-4 text-sm font-bold"
                onClick={() => setEditPrompt(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            {current.prompt}
          </h2>
        )}

        {current.options?.length ? (
          <ul className="space-y-2">
            {current.options.map((opt) => (
              <li
                key={opt}
                className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                  opt === current.answer
                    ? "border-success bg-success/10 text-success"
                    : "border-ink/10 text-ink-muted"
                }`}
              >
                {opt}
                {opt === current.answer ? " · answer" : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-muted">
            Answer:{" "}
            <span className="font-bold text-ink">
              {typeof current.answer === "string"
                ? current.answer
                : JSON.stringify(current.answer)}
            </span>
          </p>
        )}

        {current.hint_en ? (
          <p className="text-sm text-ink-faint">Hint: {current.hint_en}</p>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          className="btn-primary"
          disabled={pending}
          data-testid="admin-approve"
          onClick={() => void applyStatus("approved")}
        >
          Approve
        </button>
        <button
          type="button"
          className="rounded-pill border border-error/40 bg-error/10 px-5 py-3 text-sm font-bold text-error"
          disabled={pending}
          data-testid="admin-reject"
          onClick={() => void applyStatus("rejected")}
        >
          Reject
        </button>
        <button
          type="button"
          className="rounded-pill border border-ink/20 px-5 py-3 text-sm font-bold"
          disabled={pending}
          onClick={() => setEditPrompt(true)}
        >
          Edit prompt
        </button>
      </div>

      <p className="mt-4 text-xs text-ink-faint" data-testid="admin-shortcuts">
        Shortcuts: a approve · r reject · e edit · n next
      </p>
    </div>
  );
}
