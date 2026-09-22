type Props = {
  src: string;
  alt?: string;
};

/** Book stimulus crop — max 240px tall per design. */
export function StimulusImage({ src, alt = "Exercise stimulus" }: Props) {
  const href = src.startsWith("/") ? src : `/${src}`;

  return (
    <div
      className="mb-4 overflow-hidden rounded-2xl border border-ink/10 bg-ink/5"
      data-testid="stimulus-image"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static crop from /public */}
      <img
        src={href}
        alt={alt}
        className="mx-auto max-h-[240px] w-auto object-contain"
      />
    </div>
  );
}
