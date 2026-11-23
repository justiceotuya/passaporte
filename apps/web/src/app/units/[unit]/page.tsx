import { notFound } from "next/navigation";
import { listUnitSummaries, loadUnit } from "@/lib/content";
import { UnitDetailClient } from "@/components/UnitDetailClient";

type Props = {
  params: Promise<{ unit: string }>;
};

export default async function UnitPage({ params }: Props) {
  const { unit: raw } = await params;
  const unitNum = Number(raw);
  if (!Number.isFinite(unitNum) || unitNum < 1) notFound();

  const summaries = await listUnitSummaries();
  if (!summaries.some((u) => u.unit === unitNum)) notFound();

  let unit;
  try {
    unit = await loadUnit(unitNum);
  } catch {
    notFound();
  }

  return (
    <main>
      <UnitDetailClient unit={unit} summaries={summaries} />
    </main>
  );
}
