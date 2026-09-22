"use client";

import { useState } from "react";

const DIACRITICS = ["á", "à", "â", "ã", "é", "ê", "í", "ó", "ô", "õ", "ú", "ç"] as const;

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
};

export function FillBlankTyped({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = "Type your answer",
}: Props) {
  const [cursor, setCursor] = useState<number | null>(null);

  function insertChar(char: string) {
    if (disabled) return;
    const start = cursor ?? value.length;
    const next = value.slice(0, start) + char + value.slice(start);
    onChange(next);
    setCursor(start + char.length);
  }

  return (
    <div className="flex flex-col gap-3" data-testid="fill-blank-typed">
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
      <input
        type="text"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className="min-h-tap w-full rounded-2xl border-2 border-ink/10 bg-surface-card px-4 text-base font-medium outline-none focus:border-info"
        onChange={(event) => {
          onChange(event.target.value);
          setCursor(event.target.selectionStart);
        }}
        onSelect={(event) => {
          const target = event.target as HTMLInputElement;
          setCursor(target.selectionStart);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onSubmit();
          }
        }}
        data-testid="fill-blank-input"
      />
      <button
        type="button"
        className="btn-primary w-full"
        disabled={disabled || !value.trim()}
        onClick={onSubmit}
        data-testid="fill-blank-submit"
      >
        Check
      </button>
    </div>
  );
}
