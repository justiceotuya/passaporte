"use client";

import Link from "next/link";
import { useProgressStore } from "@/lib/progress-store";
import { PageShell } from "@/components/PageShell";

const SESSION_LENGTHS = [8, 12, 15] as const;

export function SettingsPanel() {
  const settings = useProgressStore((s) => s.settings);
  const updateSettings = useProgressStore((s) => s.updateSettings);
  const reset = useProgressStore((s) => s.reset);

  return (
    <PageShell testId="settings-page">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold text-ink">Settings</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Session preferences saved on this device.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <div className="card-surface p-4" data-testid="setting-appearance">
          <p className="text-sm font-bold text-ink">Appearance</p>
          <p className="mt-1 text-sm text-ink-muted">
            Light mode uses AA success/error pairs on cream. Dark matches the brand templates.
          </p>
          <div className="mt-4 flex gap-2">
            {(["light", "dark"] as const).map((mode) => {
              const active = settings.appearance === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  className={`min-h-tap flex-1 rounded-pill text-sm font-bold capitalize ${
                    active
                      ? "bg-primary text-ink-on"
                      : "border border-ink/20 text-ink-muted"
                  }`}
                  aria-pressed={active}
                  data-testid={`setting-appearance-${mode}`}
                  onClick={() => updateSettings({ appearance: mode })}
                >
                  {mode}
                </button>
              );
            })}
          </div>
        </div>

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
        <ToggleRow
          label="Typed fill-in"
          description="Prefer typing for fill-blank instead of tile options when both are available."
          checked={settings.typedMode}
          testId="setting-typed-mode"
          onChange={(typedMode) => updateSettings({ typedMode })}
        />

        <fieldset className="card-surface p-4" data-testid="setting-accents">
          <legend className="text-sm font-bold text-ink">Accent strictness</legend>
          <p className="mt-1 text-sm text-ink-muted">
            Lenient ignores accents on the first attempt. Strict always requires exact accents.
          </p>
          <div className="mt-4 flex gap-2">
            {(["lenient", "strict"] as const).map((mode) => {
              const active = settings.accentStrictness === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  className={`min-h-tap flex-1 rounded-pill text-sm font-bold capitalize ${
                    active
                      ? "bg-primary text-ink-on"
                      : "border border-ink/20 text-ink-muted"
                  }`}
                  aria-pressed={active}
                  data-testid={`setting-accent-${mode}`}
                  onClick={() => updateSettings({ accentStrictness: mode })}
                >
                  {mode}
                </button>
              );
            })}
          </div>
        </fieldset>

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

        <div className="card-surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-ink">Account</p>
            <p className="mt-1 text-sm text-ink-muted">
              Sign in to sync progress when Convex is configured.
            </p>
          </div>
          <Link href="/sign-in" className="btn-primary" data-testid="setting-sign-in">
            Sign in
          </Link>
        </div>

        <button
          type="button"
          className="rounded-pill border border-error/40 px-4 py-3 text-sm font-bold text-error"
          data-testid="setting-reset"
          onClick={() => {
            if (window.confirm("Reset local progress and settings on this device?")) {
              reset();
            }
          }}
        >
          Reset local progress
        </button>
      </div>
    </PageShell>
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
