import { MetricConfig, getZone, zoneColorVar, zoneLabel } from "@/lib/thresholds";
import ZoneBar from "./ZoneBar";

interface MetricTileProps {
  metric: MetricConfig;
  value: number | null | undefined;
}

export default function MetricTile({ metric, value }: MetricTileProps) {
  const v = value ?? null;
  const zone = getZone(metric.key, v);
  const displayValue = v === null ? "--" : v.toFixed(metric.precision);

  return (
    <div className="bg-surface border border-border rounded-xl p-4 flex flex-col">
      <div className="flex items-start justify-between">
        <span className="text-sm text-ink-secondary">{metric.label}</span>
        <span
          className="text-[11px] px-2 py-0.5 rounded-full"
          style={{
            color: zoneColorVar(zone),
            background: "color-mix(in srgb, " + zoneColorVar(zone) + " 16%, transparent)",
          }}
        >
          {zoneLabel(zone)}
        </span>
      </div>

      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-mono text-3xl tabular text-ink">{displayValue}</span>
        <span className="text-sm text-ink-muted">{metric.unit}</span>
      </div>

      <ZoneBar
        domainMin={metric.domainMin}
        domainMax={metric.domainMax}
        bands={metric.bands}
        value={v}
      />

      {metric.note && (
        <p className="text-[11px] text-ink-muted mt-3 leading-snug">{metric.note}</p>
      )}
    </div>
  );
}
