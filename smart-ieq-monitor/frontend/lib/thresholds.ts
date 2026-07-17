export type Zone = "good" | "warn" | "alert" | "info";

export interface Band {
  from: number;
  to: number;
  zone: Zone;
}

export interface MetricConfig {
  key: string;
  label: string;
  unit: string;
  precision: number;
  domainMin: number;
  domainMax: number;
  bands: Band[];
  note?: string;
}

// Threshold bands are indicative comfort/reference ranges for a typical
// occupied indoor space. They are not calibrated air-quality standards -
// see report Chapter 4/5 for justification and sources.

export const METRICS: MetricConfig[] = [
  {
    key: "temp_bme",
    label: "Temperature",
    unit: "\u00b0C",
    precision: 1,
    domainMin: 10,
    domainMax: 36,
    bands: [
      { from: 10, to: 16, zone: "alert" },
      { from: 16, to: 20, zone: "warn" },
      { from: 20, to: 26, zone: "good" },
      { from: 26, to: 30, zone: "warn" },
      { from: 30, to: 36, zone: "alert" },
    ],
  },
  {
    key: "humidity_bme",
    label: "Humidity",
    unit: "%",
    precision: 0,
    domainMin: 0,
    domainMax: 100,
    bands: [
      { from: 0, to: 20, zone: "alert" },
      { from: 20, to: 30, zone: "warn" },
      { from: 30, to: 60, zone: "good" },
      { from: 60, to: 70, zone: "warn" },
      { from: 70, to: 100, zone: "alert" },
    ],
  },
  {
    key: "pressure_hpa",
    label: "Pressure",
    unit: "hPa",
    precision: 1,
    domainMin: 840,
    domainMax: 900,
    bands: [{ from: 840, to: 900, zone: "info" }],
    note: "Informational - varies with elevation, not an air quality indicator",
  },
  {
    key: "gas_kohm",
    label: "Gas resistance",
    unit: "k\u03a9",
    precision: 1,
    domainMin: 0,
    domainMax: 120,
    bands: [
      { from: 0, to: 20, zone: "alert" },
      { from: 20, to: 50, zone: "warn" },
      { from: 50, to: 120, zone: "good" },
    ],
    note: "Higher resistance indicates fewer VOCs. Indicative only, uncalibrated",
  },
  {
    key: "light_lux",
    label: "Light level",
    unit: "lux",
    precision: 0,
    domainMin: 0,
    domainMax: 3500,
    bands: [
      { from: 0, to: 50, zone: "alert" },
      { from: 50, to: 100, zone: "warn" },
      { from: 100, to: 1000, zone: "good" },
      { from: 1000, to: 2000, zone: "warn" },
      { from: 2000, to: 3500, zone: "alert" },
    ],
  },
];

export function getZone(metricKey: string, value: number | null | undefined): Zone {
  if (value === null || value === undefined || Number.isNaN(value)) return "info";
  const metric = METRICS.find((m) => m.key === metricKey);
  if (!metric) return "info";
  const band = metric.bands.find((b) => value >= b.from && value < b.to);
  if (band) return band.zone;
  // Outside domain entirely - treat as alert if past the last band's edge
  const last = metric.bands[metric.bands.length - 1];
  return value >= last.to ? (last.zone === "info" ? "info" : "alert") : "info";
}

export function zoneColorVar(zone: Zone): string {
  switch (zone) {
    case "good":
      return "var(--zone-good)";
    case "warn":
      return "var(--zone-warn)";
    case "alert":
      return "var(--zone-alert)";
    default:
      return "var(--ink-muted)";
  }
}

export function zoneLabel(zone: Zone): string {
  switch (zone) {
    case "good":
      return "Normal";
    case "warn":
      return "Caution";
    case "alert":
      return "Out of range";
    default:
      return "Reference";
  }
}
