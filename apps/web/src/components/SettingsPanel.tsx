"use client";

import { useProgressStore } from "@/lib/progress-store";
import { AppNav } from "@/components/AppNav";

const SESSION_LENGTHS = [8, 12, 15] as const;

export function SettingsPanel() {
  const settings = useProgressStore((s) => s.settings);
  const updateSettings = useProgressStore((s) => s.updateSettings);

  return (
    <div
      className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-4 pb-24 pt-6"
      data-testid="settings-page"
    >
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold text-ink">Settings</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Session preferences saved on this device.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <ToggleRow
          label="Hearts"
          description="Three hearts; a miss costs one. Session ends at zero."
          checked={settings.heartsEnabled}
          testId="setting-hearts"
          onChange={(heartsEnabled) => updateSettings({ heartsEnabled })}
        />
        <ToggleRow
          label="Hints"
          description="Show English hint disclosure on each item."
          checked={settings.hintsEnabled}
          testId="setting-hints"
          onChange={(hintsEnabled) => updateSettings({ hintsEnabled })}
        />

        <fieldset className="card-surface p-4">
          <legend className="text-sm font-bold text-ink">Session length</legend>
          <p className="mt-1 text-sm text-ink-muted">
            Default size when /play has no size query.
          </p>
          <div className="mt-4 flex gap-2" data-testid="setting-session-length">
            {SESSION_LENGTHS.map((n) => {
              const active = settings.sessionLength === n;
              return (
                <button
                  key={n}
                  type="button"
                  className={`min-h-tap flex-1 rounded-pill text-sm font-bold ${
                    active
                      ? "bg-primary text-ink-on"
                      : "border border-ink/20 text-ink-muted"
                  }`}
                  aria-pressed={active}
                  onClick={() => updateSettings({ sessionLength: n })}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      <AppNav />
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  testId,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  testId: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="card-surface flex cursor-pointer items-start justify-between gap-4 p-4">
      <span>
        <span className="block text-sm font-bold text-ink">{label}</span>
        <span className="mt-1 block text-sm text-ink-muted">{description}</span>
      </span>
      <input
        type="checkbox"
        className="mt-1 h-5 w-5 accent-[theme(colors.primary.DEFAULT)]"
        checked={checked}
        data-testid={testId}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
