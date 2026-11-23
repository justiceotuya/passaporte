"use client";

import { useState } from "react";

type Props = {
  hint: string;
};

/**
 * Hint affordance from PassaporteItems template.
 * Collapsed: warning pill with “? Hint”. Expanded: left-border panel under the button.
 */
export function HintDisclosure({ hint }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3" data-testid="hint-disclosure">
      <button
        type="button"
        className={`inline-flex h-11 items-center gap-2 rounded-pill px-3.5 text-sm font-bold text-warning transition duration-fast ${
          open ? "bg-warning/20" : "bg-warning/10"
        }`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        data-testid="hint-toggle"
      >
        <span className="text-[15px] leading-none" aria-hidden>
          ?
        </span>
        Hint
      </button>
      {open ? (
        <div
          className="mt-2 rounded-r-xl border-l-[3px] border-warning bg-warning/[0.08] px-3.5 py-3 text-sm font-medium leading-normal text-ink"
          data-testid="hint-body"
        >
          {hint}
        </div>
      ) : null}
    </div>
  );
}
