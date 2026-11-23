import { listUnitSummaries, loadUnit } from "@/lib/content";
import { ReviewQueue } from "@/components/ReviewQueue";

export default async function ReviewPage() {
  const labels: Record<string, string> = {};
  const summaries = await listUnitSummaries();
  const units = await Promise.all(summaries.map((s) => loadUnit(s.unit)));
  for (const unit of units) {
    for (const item of unit.items) {
      labels[item.id] = item.prompt;
    }
  }

  return (
    <main>
      <ReviewQueue itemLabels={labels} />
    </main>
  );
}
