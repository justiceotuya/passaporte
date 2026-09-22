"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type WheelEvent as ReactWheelEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { createPortal } from "react-dom";

type Props = {
  src: string;
  alt: string;
  onClose: () => void;
};

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const WHEEL_STEP = 0.12;

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);
}

/** Full-screen enlarge overlay for book crop images. */
export function ImageLightbox({ src, alt, onClose }: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const scaleRef = useRef(1);
  const imgRef = useRef<HTMLImageElement>(null);
  const pinchStartDist = useRef<number | null>(null);
  const pinchStartScale = useRef(1);

  const applyScale = useCallback((next: number) => {
    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
    scaleRef.current = clamped;
    if (imgRef.current) {
      imgRef.current.style.transform = `scale(${clamped})`;
    }
  }, []);

  useEffect(() => {
    previousFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus.current?.focus();
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = getFocusable(dialogRef.current);
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function onBackdropClick(event: ReactMouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  function onDialogKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
    }
  }

  function onWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -WHEEL_STEP : WHEEL_STEP;
    applyScale(scaleRef.current + delta);
  }

  function touchDistance(touches: ReactTouchEvent["touches"]): number {
    const a = touches[0];
    const b = touches[1];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }

  function onTouchStart(event: ReactTouchEvent<HTMLDivElement>) {
    if (event.touches.length === 2) {
      pinchStartDist.current = touchDistance(event.touches);
      pinchStartScale.current = scaleRef.current;
    }
  }

  function onTouchMove(event: ReactTouchEvent<HTMLDivElement>) {
    if (event.touches.length !== 2 || pinchStartDist.current == null) return;
    event.preventDefault();
    const dist = touchDistance(event.touches);
    applyScale(pinchStartScale.current * (dist / pinchStartDist.current));
  }

  function onTouchEnd(event: ReactTouchEvent<HTMLDivElement>) {
    if (event.touches.length < 2) {
      pinchStartDist.current = null;
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-surface-deep/90 p-3 sm:p-6"
      data-testid="image-lightbox-backdrop"
      onClick={onBackdropClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex max-h-full w-full max-w-4xl flex-col outline-none"
        data-testid="image-lightbox"
        onKeyDown={onDialogKeyDown}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <p
            id={titleId}
            className="truncate font-display text-sm font-semibold text-ink"
          >
            Enlarged image
          </p>
          <button
            ref={closeRef}
            type="button"
            className="inline-flex min-h-tap min-w-tap items-center justify-center rounded-pill border border-ink/20 bg-surface-card px-4 text-sm font-bold uppercase tracking-wide text-ink transition duration-fast ease-out hover:border-ink/40"
            data-testid="image-lightbox-close"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div
          className="flex max-h-[calc(100dvh-5.5rem)] flex-1 items-center justify-center overflow-auto rounded-2xl border border-ink/10 bg-surface/80 touch-pan-y"
          data-testid="image-lightbox-stage"
          onWheel={onWheel}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static crop from /public */}
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            className="max-h-[calc(100dvh-5.5rem)] max-w-full origin-center object-contain transition-transform duration-fast ease-out"
            draggable={false}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
