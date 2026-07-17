import { METRICS, getZone, zoneColorVar } from "@/lib/thresholds";
import { Reading } from "@/lib/api";

interface AlertBannerProps {
  latest: Reading | null;
}

export default function AlertBanner({ latest }: AlertBannerProps) {
  if (!latest) return null;

  const breached = METRICS.filter((m) => {
    const value = latest[m.key as keyof Reading] as number | null;
    const zone = getZone(m.key, value);
    return zone === "warn" || zone === "alert";
  });

  if (breached.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {breached.map((m) => {
        const value = latest[m.key as keyof Reading] as number | null;
        const zone = getZone(m.key, value);
        return (
          <div
            key={m.key}
            className="flex items-center gap-3 rounded-lg px-4 py-2 border"
            style={{
              borderColor: zoneColorVar(zone),
              background: "color-mix(in srgb, " + zoneColorVar(zone) + " 10%, transparent)",
            }}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: zoneColorVar(zone) }}
            />
            <span className="text-sm text-ink">
              {m.label} is outside the normal range
              {value !== null ? ` (${value.toFixed(m.precision)} ${m.unit})` : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}
