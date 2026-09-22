"use client";

import { useState } from "react";
import { ImageLightbox } from "@/components/ImageLightbox";

type Props = {
  src: string;
  alt?: string;
};

/** Book stimulus crop — max 240px tall per design; click to enlarge. */
export function StimulusImage({ src, alt = "Exercise stimulus" }: Props) {
  const href = src.startsWith("/") ? src : `/${src}`;
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className="mb-4 overflow-hidden rounded-2xl border border-ink/10 bg-ink/5"
        data-testid="stimulus-image"
      >
        <button
          type="button"
          className="group relative block w-full cursor-zoom-in text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          aria-haspopup="dialog"
          aria-label={`Enlarge ${alt}`}
          data-testid="stimulus-image-zoom"
          onClick={() => setOpen(true)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static crop from /public */}
          <img
            src={href}
            alt=""
            className="mx-auto max-h-[240px] w-auto object-contain"
          />
          <span className="pointer-events-none absolute bottom-2 right-2 rounded-pill border border-ink/15 bg-surface-deep/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ink opacity-90 transition duration-fast ease-out group-hover:opacity-100 sm:opacity-80">
            Zoom
          </span>
        </button>
      </div>

      {open ? (
        <ImageLightbox
          src={href}
          alt={alt}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
