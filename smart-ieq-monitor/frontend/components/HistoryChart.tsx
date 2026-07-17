"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { METRICS } from "@/lib/thresholds";
import { Reading } from "@/lib/api";

interface HistoryChartProps {
  history: Reading[];
}

const RANGES = [
  { label: "30 min", minutes: 30 },
  { label: "2 hr", minutes: 120 },
  { label: "24 hr", minutes: 1440 },
  { label: "All", minutes: Infinity },
];

export default function HistoryChart({ history }: HistoryChartProps) {
  const [metricKey, setMetricKey] = useState(METRICS[0].key);
  const [rangeMinutes, setRangeMinutes] = useState(RANGES[1].minutes);

  const metric = METRICS.find((m) => m.key === metricKey)!;

  const filtered = useMemo(() => {
    if (!Number.isFinite(rangeMinutes)) return history;
    const cutoff = Date.now() - rangeMinutes * 60 * 1000;
    return history.filter((r) => new Date(r.recorded_at).getTime() >= cutoff);
  }, [history, rangeMinutes]);

  const chartData = filtered.map((r) => ({
    time: new Date(r.recorded_at).getTime(),
    value: r[metric.key as keyof Reading] as number | null,
  }));

  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap gap-1">
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetricKey(m.key)}
              className="text-xs px-2.5 py-1 rounded-md border transition-colors"
              style={{
                borderColor: m.key === metricKey ? "var(--accent)" : "var(--border)",
                color: m.key === metricKey ? "var(--accent)" : "var(--ink-secondary)",
                background:
                  m.key === metricKey
                    ? "color-mix(in srgb, var(--accent) 12%, transparent)"
                    : "transparent",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.label}
              onClick={() => setRangeMinutes(r.minutes)}
              className="text-xs px-2.5 py-1 rounded-md border transition-colors"
              style={{
                borderColor: r.minutes === rangeMinutes ? "var(--accent)" : "var(--border)",
                color: r.minutes === rangeMinutes ? "var(--accent)" : "var(--ink-secondary)",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ position: "relative", width: "100%", height: 260 }}>
        {chartData.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-sm text-ink-muted">
            No readings in this range yet
          </div>
        ) : (
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#2a3644" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="time"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(t) =>
                  new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                }
                stroke="#63758a"
                tick={{ fontSize: 11, fill: "#9fb0c0" }}
              />
              <YAxis
                stroke="#63758a"
                tick={{ fontSize: 11, fill: "#9fb0c0" }}
                width={40}
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{
                  background: "#1c2733",
                  border: "1px solid #2a3644",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelFormatter={(t) => new Date(t).toLocaleString()}
                formatter={(val) => {
                  const num = typeof val === "number" ? val : Number(val);
                  const text = Number.isFinite(num) ? num.toFixed(metric.precision) : "--";
                  return [`${text} ${metric.unit}`, metric.label];
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#4fa8e8"
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
