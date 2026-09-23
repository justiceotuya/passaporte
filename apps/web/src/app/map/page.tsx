import { listUnitSummaries } from "@/lib/content";
import { UnitMap } from "@/components/UnitMap";

export default function MapPage() {
  const units = listUnitSummaries();

  return (
    <main>
      <UnitMap
        units={units.map((u) => ({
          unit: u.unit,
          title: u.title,
          itemCount: u.itemCount,
          itemIds: u.itemIds,
        }))}
      />
    </main>
  );
}
