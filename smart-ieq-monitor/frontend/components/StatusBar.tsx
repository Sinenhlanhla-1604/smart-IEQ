"use client";

import { Reading } from "@/lib/api";

interface StatusBarProps {
  latest: Reading | null;
  isOnline: boolean;
  secondsSinceUpdate: number | null;
}

export default function StatusBar({ latest, isOnline, secondsSinceUpdate }: StatusBarProps) {
  const lastSeenText =
    secondsSinceUpdate === null
      ? "No data yet"
      : secondsSinceUpdate < 60
      ? `${secondsSinceUpdate}s ago`
      : `${Math.floor(secondsSinceUpdate / 60)}m ago`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-surface border border-border rounded-xl px-4 py-3">
      <div className="flex items-center gap-3">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: isOnline ? "var(--zone-good)" : "var(--zone-alert)" }}
        />
        <span className="font-mono text-sm text-ink">
          {latest?.device_id ?? "No device"}
        </span>
        <span className="text-sm text-ink-muted">
          {isOnline ? "Online" : "Offline"}
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm text-ink-secondary">
        <span>Last reading: {lastSeenText}</span>
      </div>
    </div>
  );
}
