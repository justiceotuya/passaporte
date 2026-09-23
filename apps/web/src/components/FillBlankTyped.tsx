"use client";

import { useRef } from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";

const DIACRITICS = ["á", "à", "â", "ã", "é", "ê", "í", "ó", "ô", "õ", "ú", "ç"] as const;

type Props = {
  onSubmit: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function FillBlankTyped({
  onSubmit,
  disabled,
  placeholder = "Type your answer",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cursorRef = useRef<number | null>(null);

  const form = useForm({
    defaultValues: { answer: "" },
    onSubmit: ({ value }) => {
      const trimmed = value.answer.trim();
      if (!trimmed) {
        toast.error("Type an answer first");
        return;
      }
      onSubmit(trimmed);
    },
  });

  function insertChar(char: string) {
    if (disabled) return;
    const current = form.getFieldValue("answer");
    const start = cursorRef.current ?? current.length;
    const next = current.slice(0, start) + char + current.slice(start);
    form.setFieldValue("answer", next);
    cursorRef.current = start + char.length;
    queueMicrotask(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      const pos = cursorRef.current ?? next.length;
      el.setSelectionRange(pos, pos);
    });
  }

  return (
    <form
      className="flex flex-col gap-3"
      data-testid="fill-blank-typed"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (disabled) return;
        void form.handleSubmit();
      }}
    >
      <div className="flex flex-wrap gap-2" aria-label="Portuguese diacritics">
        {DIACRITICS.map((char) => (
          <button
            key={char}
            type="button"
            disabled={disabled}
            className="min-h-tap min-w-tap rounded-xl border border-ink/10 bg-surface-card px-3 text-base font-semibold disabled:opacity-50"
            onClick={() => insertChar(char)}
          >
            {char}
          </button>
        ))}
      </div>

      <form.Field
        name="answer"
        validators={{
          onSubmit: ({ value }) =>
            value.trim() ? undefined : "Type an answer first",
        }}
      >
        {(field) => (
          <>
            <input
              ref={inputRef}
              type="text"
              value={field.state.value}
              disabled={disabled}
              placeholder={placeholder}
              autoComplete="off"
              spellCheck={false}
              className="min-h-tap w-full rounded-2xl border-2 border-ink/10 bg-surface-card px-4 text-base font-medium outline-none focus:border-info"
              onBlur={field.handleBlur}
              onChange={(event) => {
                field.handleChange(event.target.value);
                cursorRef.current = event.target.selectionStart;
              }}
              onSelect={(event) => {
                const target = event.target as HTMLInputElement;
                cursorRef.current = target.selectionStart;
              }}
              data-testid="fill-blank-input"
            />
            {field.state.meta.errors.length > 0 ? (
              <span className="text-xs text-error" role="alert">
                {field.state.meta.errors.join(", ")}
              </span>
            ) : null}
          </>
        )}
      </form.Field>

      <form.Subscribe selector={(state) => state.values.answer}>
        {(answer) => (
          <button
            type="submit"
            className="btn-primary w-full"
            disabled={disabled || !String(answer).trim()}
            data-testid="fill-blank-submit"
            onClick={(event) => {
              // Ensure submit works even when Enter / synthetic clicks skip native form submit.
              if (disabled || !String(answer).trim()) return;
              event.preventDefault();
              void form.handleSubmit();
            }}
          >
            Check
          </button>
        )}
      </form.Subscribe>
    </form>
  );
}
