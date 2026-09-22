"use client";

import { useState } from "react";

type Props = {
  hint: string;
};

export function HintDisclosure({ hint }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3">
      <button
        type="button"
        className="min-h-tap text-left text-sm font-semibold text-info"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? "Hide hint" : "Hint"}
      </button>
      {open ? (
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}
