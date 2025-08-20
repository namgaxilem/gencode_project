"use client";

import * as Select from "@radix-ui/react-select";
import * as Switch from "@radix-ui/react-switch";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

// NEW: theme store
import { useThemeStore } from "@/stores/useThemeStore";
// Existing app settings store (keep using it for other settings)
import { useSettingsStore } from "@/stores/useSettingsStore";

export default function SettingsPage() {
  // Theme (dark mode) from dedicated store
  const darkMode = useThemeStore((s) => s.darkMode);
  const setDarkMode = useThemeStore((s) => s.setDarkMode);

  // Other settings from your app store
  const s = useSettingsStore();
  const set = useSettingsStore((st) => st.set);

  return (
    <div className="mx-auto max-w-4xl p-4 lg:p-6">
      <h1 className="mb-6 text-2xl font-semibold">Settings</h1>

      {/* Appearance */}
      <Section title="Appearance" desc="Theme, density and sidebar behavior.">
        <Row label="Dark mode" hint="Switch between light and dark theme.">
          <SwitchRoot
            checked={darkMode}
            onCheckedChange={setDarkMode}
          />
        </Row>

        {/* <Row label="Sidebar" hint="Show full sidebar by default.">
          <SwitchRoot
            checked={s.sidebarExpanded}
            onCheckedChange={(v) => set("sidebarExpanded", v)}
          />
        </Row>

        <Row label="Density" hint="Control padding and spacing.">
          <SelectRoot
            value={s.density}
            onValueChange={(v) => set("density", v as any)}
            options={[
              { value: "comfortable", label: "Comfortable" },
              { value: "compact", label: "Compact" },
            ]}
          />
        </Row> */}
      </Section>
    </div>
  );
}

function Section({
  title,
  desc,
  children,
}: React.PropsWithChildren<{ title: string; desc?: string }>) {
  return (
    <section className="mb-8 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
      <div className="mb-4">
        <h2 className="text-lg font-medium">{title}</h2>
        {desc && <p className="mt-1 text-sm text-neutral-400">{desc}</p>}
      </div>
      <div className="divide-y divide-neutral-800">{children}</div>
    </section>
  );
}

function Row({
  label,
  hint,
  children,
}: React.PropsWithChildren<{ label: string; hint?: string }>) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-neutral-400">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SwitchRoot({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <Switch.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      className="relative inline-flex h-6 w-11 items-center rounded-full bg-neutral-700 data-[state=checked]:bg-blue-600 focus:outline-none"
    >
      <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-[22px]" />
    </Switch.Root>
  );
}