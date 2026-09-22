import Link from "next/link";
import { listUnitSummaries, loadUnit } from "@/lib/content";
import type { PassaporteUnit } from "@/types/item";
import { SessionPlayer } from "@/components/SessionPlayer";
import { ReviewSessionPlayer } from "@/components/ReviewSessionPlayer";

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

function loadAllPlayableUnit(): PassaporteUnit {
  const summaries = listUnitSummaries();
  const first = loadUnit(summaries[0]?.unit ?? 1);
  const items = summaries.flatMap((s) => loadUnit(s.unit).items);
  return {
    ...first,
    title: "Review",
    items,
  };
}

export default async function PlayPage({ searchParams }: Props) {
  const params = await searchParams;
  const reviewOnly = params.review === "1";
  const unit = reviewOnly ? loadAllPlayableUnit() : pickUnit(params.unit);
  const parsed = Number(params.size);
  const sessionSize =
    Number.isFinite(parsed) && parsed >= 1 && parsed <= 15 ? parsed : undefined;

  return (
    <main>
      <header className="mx-auto flex w-full max-w-lg items-center justify-between px-4 pt-4">
        <Link
          href={reviewOnly ? "/review" : `/units/${unit.unit}`}
          className="font-display text-lg font-semibold text-primary"
        >
          Passaporte
        </Link>
        <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">
          {reviewOnly ? "Review" : `U${unit.unit}`}
        </p>
      </header>
      {reviewOnly ? (
        <ReviewSessionPlayer unit={unit} sessionSize={sessionSize} />
      ) : (
        <SessionPlayer unit={unit} sessionSize={sessionSize} />
      )}
    </main>
  );
}
