import { listUnitSummaries } from "@/lib/content";
import { UnitMap } from "@/components/UnitMap";

export default async function MapPage() {
  const units = await listUnitSummaries();

  return (
    <main>
      <UnitMap
        initialUnits={units.map((u) => ({
          unit: u.unit,
          title: u.title,
          itemCount: u.itemCount,
          itemIds: u.itemIds,
        }))}
      />
    </main>
  );
}
