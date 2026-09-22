import Link from "next/link";
import { listUnitSummaries, loadUnit } from "@/lib/content";
import type { PassaporteUnit } from "@/types/item";
import { SessionPlayer } from "@/components/SessionPlayer";
import { isPlayableItem } from "@/lib/session-builder";

type Props = {
  searchParams: Promise<{ size?: string; unit?: string; review?: string }>;
};

function pickUnit(unitParam: string | undefined): PassaporteUnit {
  const summaries = listUnitSummaries();
  const requested = Number(unitParam);
  if (Number.isFinite(requested) && summaries.some((u) => u.unit === requested)) {
    return loadUnit(requested);
  }
  return loadUnit(summaries[0]?.unit ?? 1);
}

export default async function PlayPage({ searchParams }: Props) {
  const params = await searchParams;
  const unit = pickUnit(params.unit);
  const parsed = Number(params.size);
  const sessionSize =
    Number.isFinite(parsed) && parsed >= 1 && parsed <= 15 ? parsed : undefined;

  const playable = unit.items.filter(isPlayableItem);
  const reviewOnly = params.review === "1";
  const sessionUnit: PassaporteUnit = reviewOnly
    ? {
        ...unit,
        items: playable,
      }
    : unit;

  return (
    <main>
      <header className="mx-auto flex w-full max-w-lg items-center justify-between px-4 pt-4">
        <Link
          href={`/units/${unit.unit}`}
          className="font-display text-lg font-semibold text-primary"
        >
          Passaporte
        </Link>
        <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">
          U{unit.unit}
          {reviewOnly ? " · Review" : ""}
        </p>
      </header>
      <SessionPlayer unit={sessionUnit} sessionSize={sessionSize} />
    </main>
  );
}
