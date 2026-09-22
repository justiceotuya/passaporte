import { listUnitSummaries, loadUnit } from "@/lib/content";
import { ReviewQueue } from "@/components/ReviewQueue";

export default function ReviewPage() {
  const labels: Record<string, string> = {};
  for (const summary of listUnitSummaries()) {
    const unit = loadUnit(summary.unit);
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
