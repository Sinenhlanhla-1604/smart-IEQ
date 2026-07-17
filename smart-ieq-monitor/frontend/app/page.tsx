"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchLatest, fetchHistory, Reading } from "@/lib/api";
import { METRICS } from "@/lib/thresholds";
import StatusBar from "@/components/StatusBar";
import AlertBanner from "@/components/AlertBanner";
import MetricTile from "@/components/MetricTile";
import HistoryChart from "@/components/HistoryChart";

const POLL_MS = 5000;
const HISTORY_LIMIT = 500;

export default function DashboardPage() {
  const [latest, setLatest] = useState<Reading | null>(null);
  const [history, setHistory] = useState<Reading[]>([]);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);

  const loadLatest = useCallback(async () => {
    try {
      const reading = await fetchLatest();
      setLatest(reading);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reach the API");
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const readings = await fetchHistory(HISTORY_LIMIT);
      setHistory(readings);
    } catch {
      // Non-fatal - the live tiles still work even if history fails
    }
  }, []);

  useEffect(() => {
    loadLatest();
    loadHistory();
    const liveInterval = setInterval(loadLatest, POLL_MS);
    const historyInterval = setInterval(loadHistory, POLL_MS * 6);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(liveInterval);
      clearInterval(historyInterval);
      clearInterval(clock);
    };
  }, [loadLatest, loadHistory]);

  const secondsSinceUpdate = latest
    ? Math.floor((now - new Date(latest.recorded_at).getTime()) / 1000)
    : null;
  const isOnline = secondsSinceUpdate !== null && secondsSinceUpdate < 30;

  return (
    <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-medium text-ink">Smart IEQ Monitor</h1>
        <p className="text-sm text-ink-muted mt-1">
          Live indoor environmental quality readings
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-[color:var(--zone-alert)] bg-[color:color-mix(in_srgb,var(--zone-alert)_10%,transparent)] px-4 py-2 text-sm text-ink">
          Can&apos;t reach the API right now. Check that the Flask server is running
          and NEXT_PUBLIC_API_URL is set correctly.
        </div>
      )}

      <StatusBar latest={latest} isOnline={isOnline} secondsSinceUpdate={secondsSinceUpdate} />

      <AlertBanner latest={latest} />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {METRICS.map((m) => (
          <MetricTile
            key={m.key}
            metric={m}
            value={latest ? (latest[m.key as keyof Reading] as number | null) : null}
          />
        ))}
      </div>

      <HistoryChart history={history} />
    </main>
  );
}
