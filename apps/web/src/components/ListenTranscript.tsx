"use client";

import { useState } from "react";

type Props = {
  transcript: string;
};

/** Collapsible printed transcript — audio out of scope. */
export function ListenTranscript({ transcript }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-2" data-testid="listen-transcript">
      <button
        type="button"
        className="inline-flex min-h-tap items-center gap-2 rounded-pill bg-info/10 px-3.5 text-sm font-bold text-info"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Hide transcript" : "Show transcript"}
      </button>
      {open ? (
        <p className="book-text mt-3 rounded-2xl border border-ink/10 bg-ink/5 p-4 text-base">
          {transcript}
        </p>
      ) : null}
    </div>
  );
}
