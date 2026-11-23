import Link from "next/link";
import { listUnitSummaries, loadUnit } from "@/lib/content";
import type { PassaporteUnit } from "@/types/item";
import { SessionPlayer } from "@/components/SessionPlayer";
import { ReviewSessionPlayer } from "@/components/ReviewSessionPlayer";

type Props = {
  searchParams: Promise<{ size?: string; unit?: string; review?: string }>;
};

async function pickUnit(unitParam: string | undefined): Promise<PassaporteUnit> {
  const summaries = await listUnitSummaries();
  const requested = Number(unitParam);
  if (Number.isFinite(requested) && summaries.some((u) => u.unit === requested)) {
    return loadUnit(requested);
  }
  return loadUnit(summaries[0]?.unit ?? 1);
}

async function loadAllPlayableUnit(): Promise<PassaporteUnit> {
  const summaries = await listUnitSummaries();
  const firstUnitNum = summaries[0]?.unit ?? 1;
  const first = await loadUnit(firstUnitNum);
  const loaded = await Promise.all(summaries.map((s) => loadUnit(s.unit)));
  const items = loaded.flatMap((u) => u.items);
  return {
    ...first,
    title: "Review",
    items,
  };
}

export default async function PlayPage({ searchParams }: Props) {
  const params = await searchParams;
  const reviewOnly = params.review === "1";
  const unit = reviewOnly ? await loadAllPlayableUnit() : await pickUnit(params.unit);
  const parsed = Number(params.size);
  const sessionSize =
    Number.isFinite(parsed) && parsed >= 1 && parsed <= 15 ? parsed : undefined;

  return (
    <main className="min-h-screen">
      <header className="mx-auto flex w-full max-w-lg items-center justify-between px-4 pt-4 md:max-w-2xl lg:max-w-[760px] lg:px-10 lg:pt-8">
        <Link
          href={reviewOnly ? "/review" : `/units/${unit.unit}`}
          className="font-display text-lg font-semibold text-primary"
        >
          Passaporte
        </Link>
        <div className="flex items-center gap-3">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">
            {reviewOnly ? "Review" : `U${unit.unit}`}
          </p>
          <Link
            href="/settings"
            className="text-xs font-bold uppercase tracking-wide text-ink-muted"
            data-testid="play-settings-link"
          >
            Settings
          </Link>
        </div>
      </header>
      {reviewOnly ? (
        <ReviewSessionPlayer unit={unit} sessionSize={sessionSize} />
      ) : (
        <SessionPlayer unit={unit} sessionSize={sessionSize} />
      )}
    </main>
  );
}
