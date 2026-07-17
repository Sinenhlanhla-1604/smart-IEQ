import { Band, Zone, zoneColorVar } from "@/lib/thresholds";

interface ZoneBarProps {
  domainMin: number;
  domainMax: number;
  bands: Band[];
  value: number | null;
}

export default function ZoneBar({ domainMin, domainMax, bands, value }: ZoneBarProps) {
  const span = domainMax - domainMin;
  const pct = (n: number) => Math.min(100, Math.max(0, ((n - domainMin) / span) * 100));

  const markerPct = value === null ? null : pct(value);

  return (
    <div className="relative w-full h-2 mt-3">
      <div className="absolute inset-0 flex overflow-hidden rounded-sm">
        {bands.map((b, i) => (
          <div
            key={i}
            style={{
              width: `${pct(b.to) - pct(b.from)}%`,
              background: zoneColorVar(b.zone as Zone),
              opacity: 0.35,
            }}
          />
        ))}
      </div>
      {markerPct !== null && (
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-[3px] h-4 rounded-full bg-ink"
          style={{ left: `${markerPct}%` }}
        />
      )}
    </div>
  );
}
