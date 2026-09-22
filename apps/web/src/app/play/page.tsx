import { readFileSync } from "node:fs";
import path from "node:path";
import type { PassaporteUnit } from "@/types/item";
import { SessionPlayer } from "@/components/SessionPlayer";

function loadUnit(): PassaporteUnit {
  const file = path.join(process.cwd(), "../../content/passaporte/u01.json");
  return JSON.parse(readFileSync(file, "utf8")) as PassaporteUnit;
}

export default function PlayPage() {
  const unit = loadUnit();

  return (
    <main>
      <header className="mx-auto flex w-full max-w-lg items-center justify-between px-4 pt-4">
        <p className="font-display text-lg font-semibold text-primary">Passaporte</p>
        <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">
          {unit.title}
        </p>
      </header>
      <SessionPlayer unit={unit} />
    </main>
  );
}
